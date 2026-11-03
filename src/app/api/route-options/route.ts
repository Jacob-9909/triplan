import { getPool, jsonError, UUID_RE, type Row } from "@/lib/db";
import { canUseExternalApis } from "@/lib/auth";
import { listChildren, requireEditBody } from "@/lib/crud";
import type { RouteLeg, RouteOption } from "@/lib/types";
import { valhallaRoute, type RouteResult } from "@/lib/routing/valhalla";
import { odsayTransit } from "@/lib/routing/odsay";
import { isStale, providerFor } from "@/features/route/routeOptions";

const METHODS: RouteLeg["method"][] = ["walk", "transit", "taxi", "bike", "rental-car", "plane", "ferry"];

export async function GET(request: Request) {
  return listChildren(request, "route_options", "fetched_at", "경로");
}

/**
 * 구간 하나의 실제 경로를 받는다. 도보·차·자전거(Valhalla)는 저장해 두고 다시 쓴다.
 * 한국 대중교통(ODsay)은 약관상 저장하면 안 되므로 그때그때 받아 돌려주기만 한다 (id 가 live- 로 시작).
 */
export async function POST(request: Request) {
  try {
    const b = await request.json();
    const denied = await requireEditBody(request, b?.trip_id);
    if (denied) return denied;
    if (!(await canUseExternalApis(request))) return jsonError("체험 계정에서는 쓸 수 없어요.", 403);
    if (!UUID_RE.test(b.leg_id ?? "") || !METHODS.includes(b.method)) return jsonError("leg_id and method are required", 400);

    const { rows } = await getPool().query<Row>(
      `SELECT f.lat AS from_lat, f.lng AS from_lng, t.lat AS to_lat, t.lng AS to_lng
         FROM triplan.route_legs l
         JOIN triplan.map_points f ON f.id = l.from_point_id
         JOIN triplan.map_points t ON t.id = l.to_point_id
        WHERE l.id = $1 AND l.trip_id = $2`,
      [b.leg_id, b.trip_id]
    );
    const ends = rows[0] as { from_lat: number; from_lng: number; to_lat: number; to_lng: number } | undefined;
    if (!ends) return jsonError("not found", 404);
    const from = { lat: ends.from_lat, lng: ends.from_lng };
    const to = { lat: ends.to_lat, lng: ends.to_lng };
    const provider = providerFor(b.method, from, to);
    if (!provider) return jsonError("no route for this method", 400);

    if (provider === "odsay") {
      const result = await odsayTransit(from, to);
      if (result === "quota") return jsonError("오늘 대중교통 조회 한도를 다 썼어요.", 429);
      if (!result) return jsonError("경로를 찾지 못했어요.", 502);
      // 걷기 단계는 실제 길로 바꾼다 (실패하면 직선 그대로)
      for (const step of result.steps ?? []) {
        if (step.mode !== "walk" || step.shape.length < 2) continue;
        const [[aLng, aLat], [bLng, bLat]] = [step.shape[0], step.shape[step.shape.length - 1]];
        const walk = await valhallaRoute({ lat: aLat, lng: aLng }, { lat: bLat, lng: bLng }, "pedestrian");
        if (walk) step.shape = walk.shape;
      }
      result.shape = (result.steps ?? []).flatMap((s) => s.shape);
      const live: RouteOption = {
        ...result,
        id: `live-${b.leg_id}`,
        trip_id: b.trip_id,
        leg_id: b.leg_id,
        method: "transit",
        source: "odsay",
        ...ends,
        fetched_at: new Date().toISOString(),
      };
      return Response.json(live);
    }

    const { rows: existing } = await getPool().query<Row>(
      "SELECT * FROM triplan.route_options WHERE leg_id = $1 AND method = $2",
      [b.leg_id, b.method]
    );
    const saved = existing[0] as unknown as RouteOption | undefined;
    if (saved && !isStale(saved, from, to)) return Response.json(saved);

    const costing = provider === "valhalla-pedestrian" ? "pedestrian" : provider === "valhalla-auto" ? "auto" : "bicycle";
    const result: RouteResult | null = await valhallaRoute(from, to, costing);
    if (!result) return jsonError("경로를 찾지 못했어요.", 502);
    const { rows: up } = await getPool().query<Row>(
      `INSERT INTO triplan.route_options
         (trip_id, leg_id, method, source, duration_min, distance_km, fare_krw, shape, steps, from_lat, from_lng, to_lat, to_lng, fetched_at)
       VALUES ($1,$2,$3,'valhalla',$4,$5,NULL,$6,NULL,$7,$8,$9,$10, now())
       ON CONFLICT (leg_id, method) DO UPDATE SET
         duration_min = $4, distance_km = $5, shape = $6,
         from_lat = $7, from_lng = $8, to_lat = $9, to_lng = $10, fetched_at = now()
       RETURNING *`,
      [b.trip_id, b.leg_id, b.method, result.duration_min, result.distance_km, JSON.stringify(result.shape), from.lat, from.lng, to.lat, to.lng]
    );
    return Response.json(up[0]);
  } catch (err) {
    console.error("POST /api/route-options failed:", err);
    return jsonError("경로를 불러오지 못했어요.");
  }
}
