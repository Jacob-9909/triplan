import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPool, jsonError, UUID_RE } from "@/lib/db";
import type { ChildTable } from "@/lib/crud";

/**
 * 접근 제어
 * - 관리자: ADMIN_PASSWORD로 로그인하면 HMAC 서명 쿠키를 받는다. 모든 여행·위시리스트 접근.
 * - 공유 링크: 여행마다 edit_token(편집), view_token(보기) 두 개. 요청 헤더 x-trip-token으로 전달.
 * - 회원: 관리자가 만든 아이디/비밀번호로 로그인. role 이 둘이다.
 *   - demo(체험): is_demo 여행만 보기 전용, 외부 API(검색·번역·환율)는 못 쓴다.
 *   - user(사용): 자기 여행·위시리스트를 만들고, 다른 user 회원을 여행에 초대해 함께 편집한다.
 * - 관리자는 ADMIN_PASSWORD 한 명뿐이다. 회원에게 관리자 권한을 주지 않는다.
 */

const COOKIE = "triplan_admin";
const MEMBER_COOKIE = "triplan_member";
const SESSION_DAYS = 30;
export const TOKEN_HEADER = "x-trip-token";

/** admin: 관리자, owner: 여행을 만든 회원, edit: 초대된 회원·편집 링크, view: 보기 링크·체험 회원 */
export type Access = "admin" | "owner" | "edit" | "view";
export type MemberRole = "demo" | "user";
export interface Member {
  id: string;
  username: string;
  role: MemberRole;
}

/** 여행 공유 설정(링크·초대·삭제)을 바꿀 수 있는 권한 */
export function canManage(access: Access) {
  return access === "admin" || access === "owner";
}

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

/** 아이디/비밀번호가 맞으면 회원 */
export async function checkMember(username: string, password: string): Promise<Member | null> {
  const { rows } = await getPool().query<Member & { password_hash: string }>(
    "SELECT id, username, role, password_hash FROM triplan.members WHERE username = $1",
    [username]
  );
  const row = rows[0];
  return row && verifyPassword(password, row.password_hash)
    ? { id: row.id, username: row.username, role: row.role }
    : null;
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

/** ADMIN_PASSWORD 관리자 세션 */
export async function startAdminSession() {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  await setSession(COOKIE, `${exp}.${sign(`admin:${exp}`)}`);
}

/**
 * 회원 세션 서명에 비밀번호 salt 를 섞는다. 비밀번호가 바뀌면(salt 가 새로 생기면) 이전 세션은 모두 무효가 된다.
 * password_hash 는 "salt:hash" 형식이다.
 */
function memberSig(memberId: string, exp: string | number, passwordHash: string) {
  return sign(`member:${memberId}:${exp}:${passwordHash.split(":")[0]}`);
}

export async function startMemberSession(memberId: string) {
  const { rows } = await getPool().query<{ password_hash: string }>(
    "SELECT password_hash FROM triplan.members WHERE id = $1",
    [memberId]
  );
  if (!rows[0]) throw new Error("member not found");
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  await setSession(MEMBER_COOKIE, `${memberId}.${exp}.${memberSig(memberId, exp, rows[0].password_hash)}`);
}

/** 비밀번호 바꾸기. 그 회원의 모든 기존 세션이 무효가 된다 */
export async function setMemberPassword(memberId: string, password: string) {
  const { rowCount } = await getPool().query("UPDATE triplan.members SET password_hash = $1 WHERE id = $2", [
    hashPassword(password),
    memberId,
  ]);
  return (rowCount ?? 0) > 0;
}

/** 현재 비밀번호 확인 (내 비밀번호 바꾸기용) */
export async function verifyMemberPassword(memberId: string, password: string) {
  const { rows } = await getPool().query<{ password_hash: string }>(
    "SELECT password_hash FROM triplan.members WHERE id = $1",
    [memberId]
  );
  return rows[0] ? verifyPassword(password, rows[0].password_hash) : false;
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(MEMBER_COOKIE);
}

/** 로그인한 회원. 관리자가 회원을 지우거나 권한을 바꾸면 바로 반영되도록 DB도 확인한다 */
export async function currentMember(): Promise<Member | null> {
  const raw = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, sig] = raw.split(".");
  if (!id || !exp || !sig || Number(exp) < Date.now() || !UUID_RE.test(id)) return null;
  const { rows } = await getPool().query<Member & { password_hash: string }>(
    "SELECT id, username, role, password_hash FROM triplan.members WHERE id = $1",
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  try {
    if (!safeEqual(sig, memberSig(id, exp, row.password_hash))) return null;
  } catch {
    return null;
  }
  return { id: row.id, username: row.username, role: row.role };
}

/** 사용 권한(user) 회원이면 그 회원 */
export async function currentUser(): Promise<Member | null> {
  const m = await currentMember();
  return m?.role === "user" ? m : null;
}

export async function isAdmin() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  // exp.sig 형식만 관리자. 예전 회원 관리자 세션(memberId.exp.sig)은 더 받지 않는다
  const [exp, sig, extra] = raw.split(".");
  if (extra !== undefined || !exp || !sig || Number(exp) < Date.now()) return false;
  try {
    return safeEqual(sig, sign(`admin:${exp}`));
  } catch {
    return false;
  }
}

/** 관리자 또는 사용 권한 회원. 여행·위시리스트를 만들 수 있는 사람 */
export type Actor = { kind: "admin" } | { kind: "user"; member: Member };

export async function currentActor(): Promise<Actor | null> {
  if (await isAdmin()) return { kind: "admin" };
  const member = await currentUser();
  return member ? { kind: "user", member } : null;
}

export async function requireActor(): Promise<Actor | Response> {
  return (await currentActor()) ?? jsonError("unauthorized", 401);
}

/** 여행·위시리스트의 owner_id 값: 관리자는 null, 사용 회원은 자기 id */
export function ownerOf(actor: Actor) {
  return actor.kind === "user" ? actor.member.id : null;
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
  const member = await currentMember();
  const { rows } = await getPool().query<{
    edit_token: string;
    view_token: string;
    is_demo: boolean;
    owner_id: string | null;
    invited: boolean;
  }>(
    `SELECT edit_token, view_token, is_demo, owner_id,
            EXISTS (SELECT 1 FROM triplan.trip_members WHERE trip_id = t.id AND member_id = $2) AS invited
       FROM triplan.trips t WHERE id = $1`,
    [tripId, member?.id ?? null]
  );
  const row = rows[0];
  if (!row) return null;
  // 사용 권한 회원은 자기 여행·초대받은 여행에 링크보다 높은 권한을 갖는다
  if (member?.role === "user") {
    if (row.owner_id === member.id) return "owner";
    if (row.invited) return "edit";
  }
  // <img src>·EventSource처럼 헤더를 못 붙이는 요청은 ?t= 쿼리로 토큰을 받는다
  const token = request.headers.get(TOKEN_HEADER) ?? new URL(request.url).searchParams.get("t");
  if (token) {
    if (safeEqual(row.edit_token, token)) return "edit";
    if (safeEqual(row.view_token, token)) return "view";
    return null;
  }
  return row.is_demo && member ? "view" : null;
}

/**
 * 무료 한도가 있는 외부 API(장소 검색·번역·환율) 사용 허용 여부.
 * 관리자·사용 권한 회원·공유 링크 소지자만. 체험 회원과 비로그인 방문자는 막는다.
 */
export async function canUseExternalApis(request: Request) {
  if (await currentActor()) return true;
  const token = request.headers.get(TOKEN_HEADER);
  return token ? (await findTripByToken(token)) !== null : false;
}

/**
 * 권한 검사. 통과하면 Access, 아니면 그대로 반환할 에러 Response.
 * need="edit"이면 view 빼고, "manage"면 admin·owner만, "view"면 모두 통과.
 */
export async function requireTrip(
  request: Request,
  tripId: string,
  need: "view" | "edit" | "manage"
): Promise<Access | Response> {
  const access = await tripAccess(request, tripId);
  if (!access) return jsonError("unauthorized", 401);
  if (need === "edit" && access === "view") return jsonError("read-only link", 403);
  if (need === "manage" && !canManage(access)) return jsonError("only the trip owner can do this", 403);
  return access;
}

export async function requireAdmin(): Promise<Response | null> {
  return (await isAdmin()) ? null : jsonError("unauthorized", 401);
}

/** [id] 라우트용: 하위 테이블 행의 trip_id 조회 */
export async function tripIdOf(
  table: ChildTable,
  id: string
): Promise<string | null> {
  const { rows } = await getPool().query<{ trip_id: string }>(
    `SELECT trip_id FROM triplan.${table} WHERE id = $1`,
    [id]
  );
  return rows[0]?.trip_id ?? null;
}

/** 관리자·주인이 아니면 공유 토큰 컬럼을 응답에서 뺀다 */
export function stripTokens<T extends Record<string, unknown>>(trip: T, access: Access): T {
  if (canManage(access)) return trip;
  const rest = { ...trip };
  delete rest.edit_token;
  delete rest.view_token;
  return rest;
}
