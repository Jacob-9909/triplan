import { getPool, jsonError } from "@/lib/db";

type Row = Record<string, unknown>;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const tripId = new URL(request.url).searchParams.get("trip_id") ?? "";
  if (!UUID_RE.test(tripId)) return jsonError("invalid trip_id", 400);
  try {
    const { rows } = await getPool().query<Row>(
      "SELECT * FROM triplan.checklist_items WHERE trip_id = $1 ORDER BY sort_order ASC",
      [tripId]
    );
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/checklist-items failed:", err);
    return jsonError("체크리스트를 불러오지 못했어요.");
  }
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    const items = Array.isArray(b) ? b : [b];
    for (const it of items) {
      if (!it?.trip_id || typeof it?.label !== "string" || !it.label.trim()) {
        return jsonError("trip_id and label are required", 400);
      }
    }
    const vals: unknown[] = [];
    const tuples = items.map((it: Record<string, unknown>, i: number) => {
      vals.push(it.trip_id, it.label, it.category ?? "etc", it.is_checked ?? false, it.sort_order ?? 0);
      const base = i * 5;
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5})`;
    });
    const { rows } = await getPool().query<Row>(
      `INSERT INTO triplan.checklist_items (trip_id, label, category, is_checked, sort_order)
       VALUES ${tuples.join(",")} RETURNING *`,
      vals
    );
    return Response.json(Array.isArray(b) ? rows : rows[0]);
  } catch (err) {
    console.error("POST /api/checklist-items failed:", err);
    return jsonError("항목 추가에 실패했어요.");
  }
}
