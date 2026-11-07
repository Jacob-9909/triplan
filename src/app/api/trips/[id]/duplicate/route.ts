import { randomUUID } from "node:crypto";
import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { newToken, requireActor, requireTrip } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/**
 * 여행 복제: 로그인한 관리자·사용 회원이 볼 수 있는 여행을 자기 새 여행으로 복사한다.
 * 장소·구간·Day 구역·숙소·준비물(체크 해제)을 복사하고, 가계부·예약·사진·일기·별점·댓글은 뺀다.
 * start_date 를 주면 같은 일수로 날짜를 옮긴다. 경로(route_options)는 새 여행에서 다시 받는다.
 */
export async function POST(request: Request, { params }: Ctx) {
  const actor = await requireActor();
  if (actor instanceof Response) return actor;
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const access = await requireTrip(request, id, "view");
  if (access instanceof Response) return access;
  const b = await request.json().catch(() => ({}));
  const title = typeof b?.title === "string" ? b.title.trim() : "";
  if (title.length < 1 || title.length > 100) return jsonError("title must be 1-100 chars", 400);
  const start = b?.start_date ?? null;
  if (start !== null && !(typeof start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(start))) return jsonError("start_date must be YYYY-MM-DD", 400);

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const trip = await client.query<{ id: string }>(
      `INSERT INTO triplan.trips
         (title, continent, country, region, start_date, end_date, base_currency, budget_krw, travelers, edit_token, view_token, owner_id)
       SELECT $2, continent, country, region,
              COALESCE($3::date, start_date),
              CASE WHEN $3::date IS NULL OR start_date IS NULL OR end_date IS NULL THEN end_date
                   ELSE $3::date + (end_date - start_date) END,
              base_currency, budget_krw, travelers, $4, $5, $6
         FROM triplan.trips WHERE id = $1
       RETURNING id`,
      [id, title, start, newToken(), newToken(), actor.kind === "user" ? actor.member.id : null]
    );
    const newId = trip.rows[0]?.id;
    if (!newId) {
      await client.query("ROLLBACK");
      return jsonError("not found", 404);
    }
    // 장소 id 를 새로 정해 두고(옛 id → 새 id) 구간·숙소가 새 장소를 가리키게 한다
    const old = (await client.query<{ id: string }>("SELECT id FROM triplan.map_points WHERE trip_id = $1", [id])).rows.map((r) => r.id);
    const fresh = old.map(() => randomUUID());
    await client.query(
      `INSERT INTO triplan.map_points
         (id, trip_id, name, category, memo, lat, lng, day_number, visit_order, link_url, color, start_time, stay_min,
          opening_hours, image_url, info_checked_at)
       SELECT m.new_id, $1, p.name, p.category, p.memo, p.lat, p.lng, p.day_number, p.visit_order, p.link_url, p.color,
              p.start_time, p.stay_min, p.opening_hours, p.image_url, p.info_checked_at
         FROM triplan.map_points p JOIN unnest($2::uuid[], $3::uuid[]) AS m(old_id, new_id) ON m.old_id = p.id`,
      [newId, old, fresh]
    );
    await client.query(
      `INSERT INTO triplan.route_legs
         (trip_id, from_point_id, to_point_id, method, duration_min, distance_km, cost, method_chosen, duration_manual)
       SELECT $2, f.new_id, t.new_id, l.method, l.duration_min, l.distance_km, l.cost, l.method_chosen, l.duration_manual
         FROM triplan.route_legs l
         JOIN unnest($3::uuid[], $4::uuid[]) AS f(old_id, new_id) ON f.old_id = l.from_point_id
         JOIN unnest($3::uuid[], $4::uuid[]) AS t(old_id, new_id) ON t.old_id = l.to_point_id
        WHERE l.trip_id = $1`,
      [id, newId, old, fresh]
    );
    await client.query(
      `INSERT INTO triplan.trip_days (trip_id, day_number, area, stay_point_id)
       SELECT $2, d.day_number, d.area, s.new_id
         FROM triplan.trip_days d LEFT JOIN unnest($3::uuid[], $4::uuid[]) AS s(old_id, new_id) ON s.old_id = d.stay_point_id
        WHERE d.trip_id = $1 AND (d.area IS NOT NULL OR s.new_id IS NOT NULL)`,
      [id, newId, old, fresh]
    );
    await client.query(
      `INSERT INTO triplan.checklist_items (trip_id, label, category, is_checked, sort_order)
       SELECT $2, label, category, false, sort_order FROM triplan.checklist_items WHERE trip_id = $1`,
      [id, newId]
    );
    await client.query("COMMIT");
    return Response.json({ id: newId });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /api/trips/[id]/duplicate failed:", err);
    return jsonError("여행을 복제하지 못했어요.");
  } finally {
    client.release();
  }
}
