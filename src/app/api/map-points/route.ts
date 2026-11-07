import { getPool, jsonError, type Row } from "@/lib/db";
import { invalidPointField, listChildren, requireEditBody } from "@/lib/crud";

export async function GET(request: Request) {
  // 목록 썸네일용으로 처음 올린 사진 id 를 붙인다
  return listChildren(
    request,
    "map_points",
    "visit_order ASC NULLS LAST",
    "지도 핀",
    undefined,
    "*, (SELECT ph.id FROM triplan.point_photos ph WHERE ph.point_id = map_points.id ORDER BY ph.created_at LIMIT 1) AS cover_photo_id"
  );
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    if (typeof b?.name !== "string" || !b.name.trim()) {
      return jsonError("trip_id and name are required", 400);
    }
    const denied = await requireEditBody(request, b.trip_id);
    if (denied) return denied;
    const bad = invalidPointField(b);
    if (bad) return jsonError(bad, 400);
    const { rows } = await getPool().query<Row>(
      `INSERT INTO triplan.map_points
         (trip_id, name, category, memo, lat, lng, day_number, visit_order, color, start_time, stay_min)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        b.trip_id,
        b.name.trim(),
        b.category ?? "attraction",
        b.memo ?? null,
        Number(b.lat),
        Number(b.lng),
        b.day_number ?? null,
        b.visit_order ?? null,
        b.color ?? null,
        b.start_time ?? null,
        b.stay_min ?? null,
      ]
    );
    return Response.json(rows[0]);
  } catch (err) {
    console.error("POST /api/map-points failed:", err);
    return jsonError("핀 추가에 실패했어요.");
  }
}
