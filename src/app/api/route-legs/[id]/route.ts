import { getPool, jsonError } from "@/lib/db";

type Row = Record<string, unknown>;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  try {
    const b = await request.json();
    const allowed = ["method", "duration_min", "distance_km", "cost"] as const;
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const key of allowed) {
      if (b?.[key] !== undefined) {
        sets.push(`${key} = $${sets.length + 1}`);
        vals.push(b[key]);
      }
    }
    if (!sets.length) return jsonError("no fields to update", 400);
    vals.push(id);
    await getPool().query(
      `UPDATE triplan.route_legs SET ${sets.join(", ")} WHERE id = $${vals.length}`,
      vals
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/route-legs/[id] failed:", err);
    return jsonError("업데이트에 실패했어요.");
  }
}
