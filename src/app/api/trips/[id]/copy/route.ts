import { randomUUID } from "node:crypto";
import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { getPool, jsonError, UUID_RE, type Row } from "@/lib/db";
import { newToken, ownerOf, requireActor, requireTrip } from "@/lib/auth";
import { getT } from "@/i18n/server";

/** "YYYY-MM-DD" 이고 실제 있는 날짜인지 (2월 30일 같은 값은 거른다) */
function isDay(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = parseISO(v);
  return isValid(d) && format(d, "yyyy-MM-dd") === v;
}

/**
 * 여행 복제 / 내 여행으로 가져오기.
 * 볼 수 있는 여행(보기 링크·초대·체험 공개)이면 로그인한 관리자·사용 회원이 자기 여행으로 복사한다.
 * 장소·순서·이동 구간·준비물(체크 해제)·Day 구역만 옮기고, 가계부·예약·사진·평점·경로·초대는 옮기지 않는다.
 * body: { title?: string, start_date?: "YYYY-MM-DD" | null }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  // 체험 회원은 actor 가 아니라 여기서 막힌다
  const actor = await requireActor();
  if (actor instanceof Response) return actor;
  const access = await requireTrip(request, id, "view");
  if (access instanceof Response) return access;

  const b = await request.json().catch(() => ({}));
  if (b?.title != null && typeof b.title !== "string") return jsonError("title must be a string", 400);
  const startDate: unknown = b?.start_date || null;
  if (startDate !== null && !isDay(startDate)) return jsonError("start_date must be YYYY-MM-DD", 400);

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows: src } = await client.query<Row & { title: string; start_date: string | null; end_date: string | null }>(
      "SELECT * FROM triplan.trips WHERE id = $1",
      [id]
    );
    if (!src[0]) {
      await client.query("ROLLBACK");
      return jsonError("not found", 404);
    }
    const from = src[0];
    const { rows: pts } = await client.query<{ id: string; day_number: number | null }>(
      "SELECT id, day_number FROM triplan.map_points WHERE trip_id = $1",
      [id]
    );

    // 원래 여행 길이를 그대로. 날짜가 없던 여행이면 장소를 넣은 마지막 Day 까지
    let endDate: string | null = null;
    if (startDate) {
      const maxDay = Math.max(1, ...pts.map((p) => p.day_number ?? 1));
      const span =
        from.start_date && from.end_date
          ? Math.max(0, differenceInCalendarDays(parseISO(from.end_date), parseISO(from.start_date)))
          : from.start_date
            ? 0
            : maxDay - 1;
      endDate = format(addDays(parseISO(startDate), span), "yyyy-MM-dd");
    }
    const t = await getT();
    const title = (typeof b?.title === "string" && b.title.trim()) || t("{title} (복사본)", { title: from.title });

    const { rows } = await client.query<Row>(
      `INSERT INTO triplan.trips
         (title, continent, country, region, start_date, end_date, base_currency, budget_krw, travelers,
          edit_token, view_token, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        title,
        from.continent ?? null,
        from.country ?? null,
        from.region ?? null,
        startDate,
        endDate,
        from.base_currency,
        from.budget_krw ?? null,
        from.travelers ?? [],
        newToken(),
        newToken(),
        ownerOf(actor),
      ]
    );
    const newId = rows[0].id as string;

    // 예전 id → 새 id 를 먼저 정해 두고, 장소와 그 사이 구간을 같은 표로 옮긴다
    const oldIds = pts.map((p) => p.id);
    const newIds = pts.map(() => randomUUID());
    if (oldIds.length) {
      await client.query(
        `INSERT INTO triplan.map_points
           (id, trip_id, name, category, memo, lat, lng, day_number, visit_order, link_url, color, start_time, stay_min)
         SELECT m.new_id, $1, p.name, p.category, p.memo, p.lat, p.lng, p.day_number, p.visit_order,
                p.link_url, p.color, p.start_time, p.stay_min
           FROM unnest($2::uuid[], $3::uuid[]) AS m(old_id, new_id)
           JOIN triplan.map_points p ON p.id = m.old_id`,
        [newId, oldIds, newIds]
      );
      await client.query(
        `INSERT INTO triplan.route_legs
           (trip_id, from_point_id, to_point_id, method, duration_min, distance_km, cost, method_chosen, duration_manual)
         SELECT $1, f.new_id, t.new_id, l.method, l.duration_min, l.distance_km, l.cost, l.method_chosen, l.duration_manual
           FROM triplan.route_legs l
           JOIN unnest($2::uuid[], $3::uuid[]) AS f(old_id, new_id) ON f.old_id = l.from_point_id
           JOIN unnest($2::uuid[], $3::uuid[]) AS t(old_id, new_id) ON t.old_id = l.to_point_id
          WHERE l.trip_id = $4`,
        [newId, oldIds, newIds, id]
      );
    }
    // 준비물은 목록만: 체크는 새 여행에서 다시 한다
    await client.query(
      `INSERT INTO triplan.checklist_items (trip_id, label, category, is_checked, sort_order)
       SELECT $1, label, category, false, sort_order FROM triplan.checklist_items WHERE trip_id = $2`,
      [newId, id]
    );
    // Day 기록(날씨·기분·일기)은 그 여행의 것이라 두고, 구역 이름만
    await client.query(
      `INSERT INTO triplan.trip_days (trip_id, day_number, area)
       SELECT $1, day_number, area FROM triplan.trip_days WHERE trip_id = $2 AND area IS NOT NULL`,
      [newId, id]
    );
    // 하위 행 트리거가 올린 rev 까지 담아 돌려준다
    const { rows: done } = await client.query<Row>("SELECT * FROM triplan.trips WHERE id = $1", [newId]);
    await client.query("COMMIT");
    return Response.json({ ...done[0], access: actor.kind === "user" ? "owner" : "admin" });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => null);
    console.error("POST /api/trips/[id]/copy failed:", err);
    return jsonError("여행을 복사하지 못했어요.");
  } finally {
    client.release();
  }
}
