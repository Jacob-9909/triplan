import { getPool, jsonError } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  try {
    await getPool().query("DELETE FROM triplan.travel_docs WHERE id = $1", [id]);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/travel-docs/[id] failed:", err);
    return jsonError("삭제에 실패했어요.");
  }
}
