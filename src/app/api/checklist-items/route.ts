import { getPool, jsonError, type Row } from "@/lib/db";
import { listChildren, requireEditBody } from "@/lib/crud";

export async function GET(request: Request) {
  return listChildren(request, "checklist_items", "sort_order ASC", "체크리스트");
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    const items = Array.isArray(b) ? b : [b];
    if (!items.length) return jsonError("no items", 400);
    for (const it of items) {
      if (typeof it?.label !== "string" || !it.label.trim()) {
        return jsonError("trip_id and label are required", 400);
      }
    }
    // 한 요청의 항목은 모두 같은 여행이어야 한다
    const tripId = items[0].trip_id;
    if (items.some((it: Record<string, unknown>) => it.trip_id !== tripId)) {
      return jsonError("all items must share trip_id", 400);
    }
    const denied = await requireEditBody(request, tripId);
    if (denied) return denied;
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
