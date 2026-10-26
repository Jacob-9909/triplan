import { jsonError } from "@/lib/db";
import { checkPassword, startAdminSession } from "@/lib/auth";

export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD) return jsonError("ADMIN_PASSWORD is not configured", 503);
  const { password } = await request.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !checkPassword(password)) {
    // 무차별 대입 속도를 늦춘다
    await new Promise((r) => setTimeout(r, 600));
    return jsonError("비밀번호가 맞지 않아요.", 401);
  }
  await startAdminSession();
  return Response.json({ ok: true });
}
