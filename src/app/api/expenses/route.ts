import { getPool, jsonError } from "@/lib/db";

type Row = Record<string, unknown>;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const tripId = new URL(request.url).searchParams.get("trip_id") ?? "";
  if (!UUID_RE.test(tripId)) return jsonError("invalid trip_id", 400);
  try {
    const { rows } = await getPool().query<Row>(
      "SELECT * FROM triplan.expenses WHERE trip_id = $1 ORDER BY spent_at ASC NULLS LAST",
      [tripId]
    );
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/expenses failed:", err);
    return jsonError("가계부를 불러오지 못했어요.");
  }
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    for (const key of ["trip_id", "category", "title", "amount_local", "currency_code", "exchange_rate_krw", "amount_krw"]) {
      if (b?.[key] === undefined) return jsonError(`${key} is required`, 400);
    }
    const { rows } = await getPool().query<Row>(
      `INSERT INTO triplan.expenses
         (trip_id, point_id, day_number, category, title, amount_local, currency_code, exchange_rate_krw, amount_krw, spent_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        b.trip_id,
        b.point_id ?? null,
        b.day_number ?? null,
        b.category,
        b.title,
        Number(b.amount_local),
        b.currency_code,
        Number(b.exchange_rate_krw),
        Math.round(Number(b.amount_krw)),
        b.spent_at ?? null,
      ]
    );
    return Response.json(rows[0]);
  } catch (err) {
    console.error("POST /api/expenses failed:", err);
    return jsonError("지출 저장에 실패했어요.");
  }
}
