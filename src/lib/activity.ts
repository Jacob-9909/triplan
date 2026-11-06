import { getPool } from "./db";
import { currentMember, findTripByToken, isAdmin, TOKEN_HEADER } from "./auth";

/**
 * 여행 변경 기록 (triplan.trip_activity). 함께 편집할 때 "누가 무엇을 바꿨는지"를 보여 준다.
 * 기록은 덤이라, 실패해도 원래 요청은 성공으로 둔다.
 */

export type ActivityAction =
  | "point.add"
  | "point.move"
  | "point.delete"
  | "expense.add"
  | "expense.delete"
  | "doc.add"
  | "doc.delete"
  | "trip.edit";

/** 오래된 기록은 여행마다 이만큼만 남긴다 */
const KEEP = 300;

/**
 * 요청한 사람 이름: 회원 아이디, 아니면 '@admin'·'@edit-link'·'@view-link'·'@demo' (화면에서 번역).
 * 접속자 표시(SSE)와 변경 기록이 같이 쓴다
 */
export async function actorName(request: Request): Promise<string> {
  if (await isAdmin()) return "@admin";
  const member = await currentMember();
  if (member?.role === "user") return member.username;
  const token = request.headers.get(TOKEN_HEADER) ?? new URL(request.url).searchParams.get("t");
  if (token) {
    const found = await findTripByToken(token);
    if (found) return found.access === "edit" ? "@edit-link" : "@view-link";
  }
  return member ? "@demo" : "@guest";
}

export async function logActivity(
  request: Request,
  tripId: string,
  action: ActivityAction,
  target: string | null,
  detail?: Record<string, unknown>
) {
  try {
    const actor = await actorName(request);
    const pool = getPool();
    await pool.query(
      "INSERT INTO triplan.trip_activity (trip_id, actor, action, target, detail) VALUES ($1, $2, $3, $4, $5)",
      [tripId, actor, action, target?.slice(0, 120) ?? null, detail ? JSON.stringify(detail) : null]
    );
    await pool.query(
      `DELETE FROM triplan.trip_activity WHERE trip_id = $1 AND id < (
         SELECT id FROM triplan.trip_activity WHERE trip_id = $1 ORDER BY id DESC OFFSET $2 LIMIT 1)`,
      [tripId, KEEP]
    );
  } catch (err) {
    console.error("logActivity failed:", (err as Error).message);
  }
}
