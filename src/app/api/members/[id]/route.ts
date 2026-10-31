import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** 권한 바꾸기(demo ↔ user): 로그인 중인 세션도 다음 요청부터 반영 (currentMember가 DB를 확인) */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const denied = await requireAdmin();
  if (denied) return denied;
  const b = await request.json().catch(() => null);
  if (b?.role !== "demo" && b?.role !== "user") return jsonError("role must be demo or user", 400);
  const { rows } = await getPool().query(
    "UPDATE triplan.members SET role = $1 WHERE id = $2 RETURNING id, username, role, created_at",
    [b.role, id]
  );
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
