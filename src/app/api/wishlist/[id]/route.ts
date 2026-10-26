import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED = ["name", "continent", "country", "region", "lat", "lng", "memo", "tags", "priority", "trip_id"] as const;

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const b = await request.json();
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const key of ALLOWED) {
      if (b?.[key] !== undefined) {
        sets.push(`${key} = $${sets.length + 1}`);
        vals.push(b[key]);
      }
    }
    if (!sets.length) return jsonError("no fields to update", 400);
    vals.push(id);
    await getPool().query(
      `UPDATE triplan.wishlist_places SET ${sets.join(", ")} WHERE id = $${vals.length}`,
      vals
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/wishlist/[id] failed:", err);
    return jsonError("업데이트에 실패했어요.");
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await getPool().query("DELETE FROM triplan.wishlist_places WHERE id = $1", [id]);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/wishlist/[id] failed:", err);
    return jsonError("삭제에 실패했어요.");
  }
}
