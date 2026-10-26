import { getPool, jsonError, type Row } from "@/lib/db";
import { newToken, requireAdmin } from "@/lib/auth";

/** 여행 목록·생성은 관리자 전용 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { rows } = await getPool().query<Row>(
      "SELECT * FROM triplan.trips ORDER BY start_date ASC NULLS LAST, created_at DESC"
    );
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/trips failed:", err);
    return jsonError("여행 목록을 불러오지 못했어요.");
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const b = await request.json();
    if (typeof b?.title !== "string" || !b.title.trim()) {
      return jsonError("title is required", 400);
    }
    const { rows } = await getPool().query<Row>(
      `INSERT INTO triplan.trips
         (title, continent, country, region, start_date, end_date, base_currency, edit_token, view_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        b.title.trim(),
        b.continent ?? null,
        b.country ?? null,
        b.region ?? null,
        b.start_date ?? null,
        b.end_date ?? null,
        b.base_currency ?? "KRW",
        newToken(),
        newToken(),
      ]
    );
    return Response.json(rows[0]);
  } catch (err) {
    console.error("POST /api/trips failed:", err);
    return jsonError("여행 생성에 실패했어요.");
  }
}
