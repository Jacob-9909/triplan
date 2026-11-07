import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { canUseExternalApis, requireTrip, tripIdOf } from "@/lib/auth";
import { fetchPlaceInfo, type PlaceInfo } from "@/lib/placeInfo";

/** 캐시를 이만큼 쓰고 다시 찾는다 (영업시간이 바뀌므로) */
const CACHE_DAYS = 30;

/**
 * 장소 정보: 공용 캐시(place_info)에 없으면 OSM·위키백과에서 찾아 넣는다.
 * 편집 권한이면 영업시간·사진을 장소에 복사해 일정 목록이 바로 쓰게 한다 (값이 바뀔 때만 써서 실시간 알림을 줄인다).
 * 체험 계정은 외부 API 를 못 쓰니 캐시에 있는 것만 본다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const pointId = url.searchParams.get("point_id") ?? "";
  if (!UUID_RE.test(pointId)) return jsonError("invalid point_id", 400);
  const tripId = await tripIdOf("map_points", pointId);
  if (!tripId) return jsonError("not found", 404);
  const access = await requireTrip(request, tripId, "view");
  if (access instanceof Response) return access;
  const locale = url.searchParams.get("locale") === "en" ? "en" : "ko";
  try {
    const pool = getPool();
    const { rows } = await pool.query<{ name: string; lat: number; lng: number }>(
      "SELECT name, lat, lng FROM triplan.map_points WHERE id = $1",
      [pointId]
    );
    const p = rows[0];
    if (!p) return jsonError("not found", 404);
    const key = `${locale}|${p.lat.toFixed(4)},${p.lng.toFixed(4)}|${p.name}`;
    const cached = await pool.query<{ data: PlaceInfo }>(
      `SELECT data FROM triplan.place_info WHERE key = $1 AND fetched_at > now() - interval '${CACHE_DAYS} days'`,
      [key]
    );
    let info: PlaceInfo | null = cached.rows[0]?.data ?? null;
    if (!info) {
      if (!(await canUseExternalApis(request))) return Response.json({ info: null, point: null });
      info = await fetchPlaceInfo(p.name, p.lat, p.lng, locale);
      // 검색이 실패했으면(시간 초과 등) 캐시하지 않고 다음에 다시 찾는다
      if (!info) return Response.json({ info: null, point: null });
      // 못 찾은 결과(빈 객체)는 캐시한다: 같은 곳을 매번 다시 묻지 않게
      await pool.query(
        `INSERT INTO triplan.place_info (key, data) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, fetched_at = now()`,
        [key, info]
      );
    }
    let point = null;
    if (access !== "view") {
      const r = await pool.query(
        `UPDATE triplan.map_points SET opening_hours = $2, image_url = $3, info_checked_at = now()
         WHERE id = $1 AND (info_checked_at IS NULL OR opening_hours IS DISTINCT FROM $2 OR image_url IS DISTINCT FROM $3)
         RETURNING opening_hours, image_url, info_checked_at`,
        [pointId, info.hours ?? null, info.image ?? null]
      );
      point = r.rows[0] ?? null;
    }
    return Response.json({ info, point });
  } catch (err) {
    console.error("GET /api/places/info failed:", err);
    return jsonError("장소 정보를 불러오지 못했어요.");
  }
}
