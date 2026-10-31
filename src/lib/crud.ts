import { getPool, jsonError, UUID_RE, type Row } from "@/lib/db";
import { requireTrip, tripIdOf, type Access } from "@/lib/auth";

/** 여행 하위 테이블 (trip_id를 가진 테이블) */
export type ChildTable = "map_points" | "route_legs" | "expenses" | "checklist_items" | "travel_docs" | "point_photos" | "trip_days";

/** 핀 색상·도착 시각·머무는 시간 형식 검사. 문제가 있으면 오류 메시지 */
export function invalidPointField(b: Record<string, unknown> | null): string | null {
  if (!b) return null;
  if (b.color != null && !(typeof b.color === "string" && /^#[0-9a-f]{6}$/i.test(b.color))) return "color must be #rrggbb";
  if (b.start_time != null && !(typeof b.start_time === "string" && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(b.start_time))) {
    return "start_time must be HH:MM";
  }
  if (b.stay_min != null && !(Number.isInteger(b.stay_min) && (b.stay_min as number) >= 0 && (b.stay_min as number) <= 1440)) {
    return "stay_min must be 0-1440";
  }
  if (b.rating != null && !(Number.isInteger(b.rating) && (b.rating as number) >= 1 && (b.rating as number) <= 5)) {
    return "rating must be 1-5";
  }
  if (b.review != null && !(typeof b.review === "string" && b.review.length <= 500)) return "review must be 500 chars or less";
  return null;
}

/** 링크 값은 http(s)만 허용 (빈 값은 링크 삭제) */
export function cleanUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : undefined;
}

/** GET ?trip_id= 목록 조회 (보기 권한 이상) */
export async function listChildren(
  request: Request,
  table: ChildTable,
  orderBy: string,
  label: string,
  transform?: (rows: Row[], access: Access) => Row[]
) {
  const tripId = new URL(request.url).searchParams.get("trip_id") ?? "";
  if (!UUID_RE.test(tripId)) return jsonError("invalid trip_id", 400);
  const access = await requireTrip(request, tripId, "view");
  if (access instanceof Response) return access;
  try {
    const { rows } = await getPool().query<Row>(
      `SELECT * FROM triplan.${table} WHERE trip_id = $1 ORDER BY ${orderBy}`,
      [tripId]
    );
    return Response.json(transform ? transform(rows, access) : rows);
  } catch (err) {
    console.error(`GET ${table} failed:`, err);
    return jsonError(`${label} 불러오기에 실패했어요.`);
  }
}

/** POST 본문의 trip_id에 편집 권한이 있는지 확인 */
export async function requireEditBody(request: Request, tripId: unknown) {
  if (typeof tripId !== "string" || !UUID_RE.test(tripId)) return jsonError("invalid trip_id", 400);
  const access = await requireTrip(request, tripId, "edit");
  return access instanceof Response ? access : null;
}

/** [id] 라우트 공통: id 검증 + 행의 여행에 대한 편집 권한 */
async function guardRow(request: Request, table: ChildTable, id: string) {
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const tripId = await tripIdOf(table, id);
  if (!tripId) return jsonError("not found", 404);
  const access = await requireTrip(request, tripId, "edit");
  return access instanceof Response ? access : null;
}

/** PATCH: 허용된 컬럼만 갱신 */
export async function patchChild(
  request: Request,
  table: ChildTable,
  id: string,
  allowed: readonly string[]
) {
  const denied = await guardRow(request, table, id);
  if (denied) return denied;
  try {
    const b = await request.json();
    if (b && "link_url" in b) {
      const url = cleanUrl(b.link_url);
      if (url === undefined) return jsonError("link_url must start with http:// or https://", 400);
      b.link_url = url;
    }
    const bad = invalidPointField(b);
    if (bad) return jsonError(bad, 400);
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const key of allowed) {
      if (b?.[key] !== undefined) {
        sets.push(`${key} = $${sets.length + 1}`);
        vals.push(b[key]);
      }
    }
    if (!sets.length) return jsonError("no fields to update", 400);
    vals.push(id);
    await getPool().query(
      `UPDATE triplan.${table} SET ${sets.join(", ")} WHERE id = $${vals.length}`,
      vals
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`PATCH ${table} failed:`, err);
    return jsonError("업데이트에 실패했어요.");
  }
}

export async function deleteChild(request: Request, table: ChildTable, id: string) {
  const denied = await guardRow(request, table, id);
  if (denied) return denied;
  try {
    await getPool().query(`DELETE FROM triplan.${table} WHERE id = $1`, [id]);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`DELETE ${table} failed:`, err);
    return jsonError("삭제에 실패했어요.");
  }
}

/** 핀 id들이 모두 해당 여행 소속인지 (다른 여행 데이터 참조 방지) */
export async function pointsBelongTo(tripId: string, pointIds: string[]) {
  const ids = pointIds.filter(Boolean);
  if (!ids.length) return true;
  if (!ids.every((id) => UUID_RE.test(id))) return false;
  const { rows } = await getPool().query<{ n: string }>(
    "SELECT count(*)::text AS n FROM triplan.map_points WHERE trip_id = $1 AND id = ANY($2::uuid[])",
    [tripId, ids]
  );
  return Number(rows[0]?.n) === new Set(ids).size;
}
