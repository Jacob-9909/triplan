import { getPool, jsonError, UUID_RE, type Row } from "@/lib/db";
import { requireTrip } from "@/lib/auth";
import { pointsBelongTo, requireEditBody } from "@/lib/crud";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const tripId = sp.get("trip_id") ?? "";
  const from = sp.get("from_point_id") ?? "";
  const to = sp.get("to_point_id") ?? "";
  if (!UUID_RE.test(tripId)) return jsonError("invalid trip_id", 400);
  const access = await requireTrip(request, tripId, "view");
  if (access instanceof Response) return access;
  try {
    if (from && to) {
      if (!UUID_RE.test(from) || !UUID_RE.test(to)) return jsonError("invalid point id", 400);
      const { rows } = await getPool().query<Row>(
        "SELECT * FROM triplan.route_legs WHERE trip_id = $1 AND from_point_id = $2 AND to_point_id = $3 LIMIT 1",
        [tripId, from, to]
      );
      return Response.json(rows[0] ?? null);
    }
    const { rows } = await getPool().query<Row>(
      "SELECT * FROM triplan.route_legs WHERE trip_id = $1",
      [tripId]
    );
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/route-legs failed:", err);
    return jsonError("경로를 불러오지 못했어요.");
  }
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    if (!UUID_RE.test(b?.from_point_id ?? "") || !UUID_RE.test(b?.to_point_id ?? "")) {
      return jsonError("trip_id, from_point_id, to_point_id are required", 400);
    }
    const denied = await requireEditBody(request, b.trip_id);
    if (denied) return denied;
    if (!(await pointsBelongTo(b.trip_id, [b.from_point_id, b.to_point_id]))) {
      return jsonError("points must belong to the trip", 400);
    }
    const { rows } = await getPool().query<Row>(
      `INSERT INTO triplan.route_legs (trip_id, from_point_id, to_point_id, method)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [b.trip_id, b.from_point_id, b.to_point_id, b.method ?? "transit"]
    );
    return Response.json(rows[0]);
  } catch (err) {
    console.error("POST /api/route-legs failed:", err);
    return jsonError("경로 생성에 실패했어요.");
  }
}
