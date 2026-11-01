import { getPool, jsonError, type Row } from "@/lib/db";
import { invalidPointField, listChildren, pointsBelongTo, requireEditBody } from "@/lib/crud";

export async function GET(request: Request) {
  return listChildren(request, "expenses", "spent_at ASC NULLS LAST, created_at ASC", "가계부");
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    for (const key of ["category", "title", "amount_local", "currency_code", "exchange_rate_krw", "amount_krw"]) {
      if (b?.[key] === undefined) return jsonError(`${key} is required`, 400);
    }
    const bad = invalidPointField(b);
    if (bad) return jsonError(bad, 400);
    const denied = await requireEditBody(request, b.trip_id);
    if (denied) return denied;
    if (b.point_id && !(await pointsBelongTo(b.trip_id, [b.point_id]))) {
      return jsonError("point must belong to the trip", 400);
    }
    const { rows } = await getPool().query<Row>(
      `INSERT INTO triplan.expenses
         (trip_id, point_id, day_number, category, title, amount_local, currency_code, exchange_rate_krw, amount_krw, spent_at, paid_by, split_with)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
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
        b.paid_by ?? null,
        b.split_with ?? null,
      ]
    );
    return Response.json(rows[0]);
  } catch (err) {
    console.error("POST /api/expenses failed:", err);
    return jsonError("지출 저장에 실패했어요.");
  }
}
