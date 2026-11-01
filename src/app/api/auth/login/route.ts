import { jsonError } from "@/lib/db";
import { checkMember, checkPassword, startAdminSession, startMemberSession } from "@/lib/auth";

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;

// 계정별 연속 실패 횟수. IP 대신 계정으로 센다: Vercel 프록시를 거치면 여러 사람이 같은 IP로 보인다.
// ponytail: 메모리 Map, VM 의 node 프로세스 하나 기준. 재시작하면 초기화되고, 인스턴스가 늘면 DB로 옮긴다.
const fails = new Map<string, { count: number; lockedUntil: number }>();

/** 아이디가 비었거나 admin이면 관리자 비밀번호, 아니면 관리자가 만든 회원(체험·사용) */
export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD) return jsonError("ADMIN_PASSWORD is not configured", 503);
  const body = await request.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const isAdminLogin = !username || username === "admin";
  const key = isAdminLogin ? "admin" : username.toLowerCase();

  const now = Date.now();
  const entry = fails.get(key);
  if (entry && entry.lockedUntil > now) {
    const min = Math.ceil((entry.lockedUntil - now) / 60_000);
    return jsonError(`로그인을 ${MAX_FAILS}번 틀려서 잠겼어요. ${min}분 뒤에 다시 시도해 주세요.`, 429); // i18n-ignore
  }
  // 검사 전에 시도를 먼저 기록해, 동시에 몰려온 요청도 5번까지만 비밀번호를 확인한다
  if (fails.size > 10_000) fails.clear(); // 없는 아이디로 메모리를 채우지 못하게
  const count = (entry?.count ?? 0) + 1;
  fails.set(key, count >= MAX_FAILS ? { count: 0, lockedUntil: now + LOCK_MS } : { count, lockedUntil: 0 });

  if (password) {
    if (isAdminLogin) {
      if (checkPassword(password)) {
        fails.delete(key);
        await startAdminSession();
        return Response.json({ ok: true, role: "admin" });
      }
    } else {
      const member = await checkMember(username, password);
      if (member) {
        fails.delete(key);
        await startMemberSession(member.id);
        return Response.json({ ok: true, role: member.role });
      }
    }
  }
  // 무차별 대입 속도를 늦춘다
  await new Promise((r) => setTimeout(r, 600));
  if (count >= MAX_FAILS) return jsonError(`로그인을 ${MAX_FAILS}번 틀려서 15분 동안 잠겼어요.`, 429); // i18n-ignore
  return jsonError(`아이디나 비밀번호가 맞지 않아요. (${count}/${MAX_FAILS})`, 401); // i18n-ignore
}
