import { jsonError } from "@/lib/db";
import { checkMember, checkPassword, startAdminSession, startMemberSession } from "@/lib/auth";

/** 아이디가 비었거나 admin이면 관리자 비밀번호, 아니면 관리자가 만든 체험 회원 */
export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD) return jsonError("ADMIN_PASSWORD is not configured", 503);
  const body = await request.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (password) {
    if (!username || username === "admin") {
      if (checkPassword(password)) {
        await startAdminSession();
        return Response.json({ ok: true, role: "admin" });
      }
    } else {
      const memberId = await checkMember(username, password);
      if (memberId) {
        await startMemberSession(memberId);
        return Response.json({ ok: true, role: "member" });
      }
    }
  }
  // 무차별 대입 속도를 늦춘다
  await new Promise((r) => setTimeout(r, 600));
  return jsonError("아이디나 비밀번호가 맞지 않아요.", 401);
}
