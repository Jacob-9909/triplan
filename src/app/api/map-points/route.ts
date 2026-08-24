import { getPool, jsonError } from "@/lib/db";

type Row = Record<string, unknown>;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const tripId = new URL(request.url).searchParams.get("trip_id") ?? "";
  if (!UUID_RE.test(tripId)) return jsonError("invalid trip_id", 400);
  try {
    const { rows } = await getPool().query<Row>(
      "SELECT * FROM triplan.map_points WHERE trip_id = $1 ORDER BY visit_order ASC NULLS LAST",
      [tripId]
    );
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/map-points failed:", err);
    return jsonError("지도 핀을 불러오지 못했어요.");
  }
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    if (!b?.trip_id || typeof b?.name !== "string" || !b.name.trim()) {
      return jsonError("trip_id and name are required", 400);
    }
    const { rows } = await getPool().query<Row>(
      `INSERT INTO triplan.map_points (trip_id, name, category, memo, lat, lng, day_number, visit_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        b.trip_id,
        b.name.trim(),
        b.category ?? "attraction",
        b.memo ?? null,
        Number(b.lat),
        Number(b.lng),
        b.day_number ?? null,
        b.visit_order ?? null,
      ]
    );
    return Response.json(rows[0]);
  } catch (err) {
    console.error("POST /api/map-points failed:", err);
    return jsonError("핀 추가에 실패했어요.");
  }
}
