import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { requireAdmin, setMemberPassword } from "@/lib/auth";

/**
 * 관리자 전용 회원 수정. body 에 하나 이상:
 * - role: "demo" | "user"  권한 바꾸기 (로그인 중인 세션도 다음 요청부터 반영, currentMember 가 DB를 확인)
 * - password: string        비밀번호 초기화 (그 회원의 기존 로그인은 모두 풀린다)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const denied = await requireAdmin();
  if (denied) return denied;
  const b = await request.json().catch(() => null);
  const hasRole = b?.role !== undefined;
  const hasPassword = b?.password !== undefined;
  if (!hasRole && !hasPassword) return jsonError("role or password is required", 400);
  if (hasRole && b.role !== "demo" && b.role !== "user") return jsonError("role must be demo or user", 400);
  if (hasPassword && (typeof b.password !== "string" || b.password.length < 6)) {
    return jsonError("비밀번호는 6자 이상이어야 해요.", 400);
  }
  if (hasPassword && !(await setMemberPassword(id, b.password))) return jsonError("not found", 404);
  const { rows } = hasRole
    ? await getPool().query(
        "UPDATE triplan.members SET role = $1 WHERE id = $2 RETURNING id, username, role, created_at",
        [b.role, id]
      )
    : await getPool().query("SELECT id, username, role, created_at FROM triplan.members WHERE id = $1", [id]);
  return rows[0] ? Response.json(rows[0]) : jsonError("not found", 404);
}

/** 회원 삭제: 로그인 중인 세션도 다음 요청부터 무효. 그 회원의 여행은 관리자 소유로 남고, 위시리스트·초대는 지워진다 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const denied = await requireAdmin();
  if (denied) return denied;
  await getPool().query("DELETE FROM triplan.members WHERE id = $1", [id]);
  return Response.json({ ok: true });
}
