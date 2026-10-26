import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** 회원 삭제: 로그인 중인 세션도 다음 요청부터 무효 (currentMember가 DB를 확인) */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const denied = await requireAdmin();
  if (denied) return denied;
  await getPool().query("DELETE FROM triplan.members WHERE id = $1", [id]);
  return Response.json({ ok: true });
}
