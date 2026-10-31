import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { ownerOf, requireActor } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED = ["name", "continent", "country", "region", "lat", "lng", "memo", "tags", "priority", "trip_id"] as const;

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const actor = await requireActor();
  if (actor instanceof Response) return actor;
  const owner = ownerOf(actor);
  try {
    const b = await request.json();
    // 연결할 여행도 내 여행이어야 한다 (남의 여행 id 를 걸어 두지 못하게)
    if (b?.trip_id != null) {
      if (typeof b.trip_id !== "string" || !UUID_RE.test(b.trip_id)) return jsonError("invalid trip_id", 400);
      const { rows } = await getPool().query(
        "SELECT 1 FROM triplan.trips WHERE id = $1 AND owner_id IS NOT DISTINCT FROM $2",
        [b.trip_id, owner]
      );
      if (!rows.length) return jsonError("trip not found", 404);
    }
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const key of ALLOWED) {
      if (b?.[key] !== undefined) {
        sets.push(`${key} = $${sets.length + 1}`);
        vals.push(b[key]);
      }
    }
    if (!sets.length) return jsonError("no fields to update", 400);
    vals.push(id, owner);
    const { rowCount } = await getPool().query(
      `UPDATE triplan.wishlist_places SET ${sets.join(", ")}
        WHERE id = $${vals.length - 1} AND owner_id IS NOT DISTINCT FROM $${vals.length}`,
      vals
    );
    return rowCount ? Response.json({ ok: true }) : jsonError("not found", 404);
  } catch (err) {
    console.error("PATCH /api/wishlist/[id] failed:", err);
    return jsonError("업데이트에 실패했어요.");
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const actor = await requireActor();
  if (actor instanceof Response) return actor;
  try {
    await getPool().query("DELETE FROM triplan.wishlist_places WHERE id = $1 AND owner_id IS NOT DISTINCT FROM $2", [
      id,
      ownerOf(actor),
    ]);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/wishlist/[id] failed:", err);
    return jsonError("삭제에 실패했어요.");
  }
}
