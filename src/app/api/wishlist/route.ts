import { getPool, jsonError, type Row } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { rows } = await getPool().query<Row>(
      "SELECT * FROM triplan.wishlist_places ORDER BY priority DESC, created_at DESC"
    );
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/wishlist failed:", err);
    return jsonError("가고 싶은 곳 목록을 불러오지 못했어요.");
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const b = await request.json();
    if (typeof b?.name !== "string" || !b.name.trim()) return jsonError("name is required", 400);
    const { rows } = await getPool().query<Row>(
      `INSERT INTO triplan.wishlist_places (name, continent, country, region, lat, lng, memo, tags, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        b.name.trim(),
        b.continent ?? null,
        b.country ?? null,
        b.region ?? null,
        b.lat ?? null,
        b.lng ?? null,
        b.memo ?? null,
        Array.isArray(b.tags) ? b.tags.map(String).slice(0, 10) : [],
        Number.isInteger(b.priority) ? Math.min(3, Math.max(1, b.priority)) : 2,
      ]
    );
    return Response.json(rows[0]);
  } catch (err) {
    console.error("POST /api/wishlist failed:", err);
    return jsonError("저장에 실패했어요.");
  }
}
