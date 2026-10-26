import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** 관리자 권한 주기/빼기: 로그인 중인 세션도 다음 요청부터 반영 (isAdmin이 DB를 확인) */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const denied = await requireAdmin();
  if (denied) return denied;
  const b = await request.json().catch(() => null);
  if (typeof b?.is_admin !== "boolean") return jsonError("is_admin is required", 400);
  const { rows } = await getPool().query(
    "UPDATE triplan.members SET is_admin = $1 WHERE id = $2 RETURNING id, username, is_admin, created_at",
    [b.is_admin, id]
  );
  return rows[0] ? Response.json(rows[0]) : jsonError("not found", 404);
}

/** 회원 삭제: 로그인 중인 세션도 다음 요청부터 무효 (currentMember·isAdmin이 DB를 확인) */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const denied = await requireAdmin();
  if (denied) return denied;
  await getPool().query("DELETE FROM triplan.members WHERE id = $1", [id]);
  return Response.json({ ok: true });
}
