import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPool, jsonError } from "@/lib/db";

/**
 * 접근 제어
 * - 관리자: ADMIN_PASSWORD로 로그인하면 HMAC 서명 쿠키를 받는다. 모든 여행·위시리스트 접근.
 * - 공유 링크: 여행마다 edit_token(편집), view_token(보기) 두 개. 요청 헤더 x-trip-token으로 전달.
 * - 체험 회원: 관리자가 만든 아이디/비밀번호로 로그인. is_demo 여행만 보기 전용, 외부 API(검색·번역·환율)는 못 쓴다.
 */

const COOKIE = "triplan_admin";
const MEMBER_COOKIE = "triplan_member";
const SESSION_DAYS = 30;
export const TOKEN_HEADER = "x-trip-token";

export type Access = "admin" | "edit" | "view";

function secret() {
  const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("SESSION_SECRET (or ADMIN_PASSWORD) is not configured");
  return s;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function newToken() {
  return randomBytes(24).toString("base64url");
}

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // 길이 차이로 인한 조기 종료를 막기 위해 해시끼리 비교
  return safeEqual(sign(`pw:${input}`), sign(`pw:${expected}`));
}

/** 회원 비밀번호 저장 형식: salt:hash (hex, scrypt) */
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return safeEqual(scryptSync(password, salt, 32).toString("hex"), hash);
}

/** 아이디/비밀번호가 맞으면 회원 id */
export async function checkMember(username: string, password: string): Promise<string | null> {
  const { rows } = await getPool().query<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM triplan.members WHERE username = $1",
    [username]
  );
  const row = rows[0];
  return row && verifyPassword(password, row.password_hash) ? row.id : null;
}

async function setSession(name: string, value: string) {
  const jar = await cookies();
  // 관리자와 회원 세션은 동시에 갖지 않는다
  jar.delete(name === COOKIE ? MEMBER_COOKIE : COOKIE);
  jar.set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function startAdminSession() {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  await setSession(COOKIE, `${exp}.${sign(`admin:${exp}`)}`);
}

export async function startMemberSession(memberId: string) {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  await setSession(MEMBER_COOKIE, `${memberId}.${exp}.${sign(`member:${memberId}:${exp}`)}`);
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(MEMBER_COOKIE);
}

/** 로그인한 체험 회원. 관리자가 회원을 지우면 바로 무효가 되도록 DB도 확인한다 */
export async function currentMember(): Promise<{ id: string; username: string } | null> {
  const raw = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, sig] = raw.split(".");
  if (!id || !exp || !sig || Number(exp) < Date.now()) return null;
  try {
    if (!safeEqual(sig, sign(`member:${id}:${exp}`))) return null;
  } catch {
    return null;
  }
  const { rows } = await getPool().query<{ id: string; username: string }>(
    "SELECT id, username FROM triplan.members WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function isAdmin() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  try {
    return safeEqual(sig, sign(`admin:${exp}`));
  } catch {
    return false;
  }
}

/** 공유 토큰으로 여행 찾기 (공유 페이지 서버 컴포넌트용) */
export async function findTripByToken(token: string): Promise<{ tripId: string; access: "edit" | "view" } | null> {
  if (!token || token.length > 128) return null;
  const { rows } = await getPool().query<{ id: string; edit_token: string; view_token: string }>(
    "SELECT id, edit_token, view_token FROM triplan.trips WHERE edit_token = $1 OR view_token = $1 LIMIT 1",
    [token]
  );
  const row = rows[0];
  if (!row) return null;
  return { tripId: row.id, access: safeEqual(row.edit_token, token) ? "edit" : "view" };
}

/** 요청자가 해당 여행에 갖는 권한. 없으면 null */
export async function tripAccess(request: Request, tripId: string): Promise<Access | null> {
  if (await isAdmin()) return "admin";
  // <img src>처럼 헤더를 못 붙이는 요청은 ?t= 쿼리로 토큰을 받는다
  const token = request.headers.get(TOKEN_HEADER) ?? new URL(request.url).searchParams.get("t");
  const { rows } = await getPool().query<{ edit_token: string; view_token: string; is_demo: boolean }>(
    "SELECT edit_token, view_token, is_demo FROM triplan.trips WHERE id = $1",
    [tripId]
  );
  const row = rows[0];
  if (!row) return null;
  if (token) {
    if (safeEqual(row.edit_token, token)) return "edit";
    if (safeEqual(row.view_token, token)) return "view";
    return null;
  }
  return row.is_demo && (await currentMember()) ? "view" : null;
}

/**
 * 무료 한도가 있는 외부 API(장소 검색·번역·환율) 사용 허용 여부.
 * 관리자와 공유 링크 소지자만. 체험 회원과 비로그인 방문자는 막는다.
 */
export async function canUseExternalApis(request: Request) {
  if (await isAdmin()) return true;
  const token = request.headers.get(TOKEN_HEADER);
  return token ? (await findTripByToken(token)) !== null : false;
}

/**
 * 권한 검사. 통과하면 Access, 아니면 그대로 반환할 에러 Response.
 * need="edit"이면 admin·edit만, "view"면 모두 통과.
 */
export async function requireTrip(
  request: Request,
  tripId: string,
  need: "view" | "edit"
): Promise<Access | Response> {
  const access = await tripAccess(request, tripId);
  if (!access) return jsonError("unauthorized", 401);
  if (need === "edit" && access === "view") return jsonError("read-only link", 403);
  return access;
}

export async function requireAdmin(): Promise<Response | null> {
  return (await isAdmin()) ? null : jsonError("unauthorized", 401);
}

/** [id] 라우트용: 하위 테이블 행의 trip_id 조회 */
export async function tripIdOf(
  table: "map_points" | "route_legs" | "expenses" | "checklist_items" | "travel_docs" | "point_photos",
  id: string
): Promise<string | null> {
  const { rows } = await getPool().query<{ trip_id: string }>(
    `SELECT trip_id FROM triplan.${table} WHERE id = $1`,
    [id]
  );
  return rows[0]?.trip_id ?? null;
}

/** 관리자가 아니면 공유 토큰 컬럼을 응답에서 뺀다 */
export function stripTokens<T extends Record<string, unknown>>(trip: T, access: Access): T {
  if (access === "admin") return trip;
  const rest = { ...trip };
  delete rest.edit_token;
  delete rest.view_token;
  return rest;
}
