import { getPool, jsonError } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";

const USERNAME_RE = /^[a-z0-9_.-]{3,32}$/i;

/** 회원 목록·생성: 관리자 전용. role: demo(체험, 보기 전용) | user(사용: 내 여행·초대 편집) */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { rows } = await getPool().query(
    "SELECT id, username, role, created_at FROM triplan.members ORDER BY created_at DESC"
  );
  return Response.json(rows);
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const b = await request.json().catch(() => null);
  const username = typeof b?.username === "string" ? b.username.trim() : "";
  const password = typeof b?.password === "string" ? b.password : "";
  if (!USERNAME_RE.test(username) || username.toLowerCase() === "admin") {
    return jsonError("아이디는 영문·숫자·_.- 3~32자로, admin은 쓸 수 없어요.", 400);
  }
  if (password.length < 6) return jsonError("비밀번호는 6자 이상이어야 해요.", 400);
  const role = b?.role === "user" ? "user" : "demo";
  try {
    const { rows } = await getPool().query(
      "INSERT INTO triplan.members (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at",
      [username, hashPassword(password), role]
    );
    return Response.json(rows[0]);
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return jsonError("이미 있는 아이디예요.", 409);
    console.error("POST /api/members failed:", err);
    return jsonError("회원을 만들지 못했어요.");
  }
}
