import { jsonError } from "@/lib/db";
import { currentUser, setMemberPassword, startMemberSession, verifyMemberPassword } from "@/lib/auth";

/**
 * 내 비밀번호 바꾸기 (사용 회원). body: { current, next }
 * 다른 기기의 로그인은 모두 풀리고, 지금 기기는 새 세션으로 계속 로그인된다.
 * 체험 계정은 여러 사람이 같이 쓸 수 있어 바꾸지 못한다.
 */
export async function POST(request: Request) {
  const me = await currentUser();
  if (!me) return jsonError("unauthorized", 401);
  const b = await request.json().catch(() => null);
  const current = typeof b?.current === "string" ? b.current : "";
  const next = typeof b?.next === "string" ? b.next : "";
  if (next.length < 6) return jsonError("새 비밀번호는 6자 이상이어야 해요.", 400);
  if (!(await verifyMemberPassword(me.id, current))) {
    // 무차별 대입 속도를 늦춘다
    await new Promise((r) => setTimeout(r, 600));
    return jsonError("지금 비밀번호가 맞지 않아요.", 400);
  }
  if (current === next) return jsonError("지금과 다른 비밀번호를 입력해 주세요.", 400);
  await setMemberPassword(me.id, next);
  await startMemberSession(me.id);
  return Response.json({ ok: true });
}
