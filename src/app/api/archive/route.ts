import { getPool, jsonError, type Row } from "@/lib/db";
import { requireActor } from "@/lib/auth";

/**
 * 다녀온 여행 모아 보기: 끝난 여행(스탬프)과 평점·한줄평을 남긴 장소.
 * 보이는 여행은 GET /api/trips 와 같다: 관리자는 전부, 사용 회원은 내 여행 + 초대받은 여행
 */
export async function GET() {
  const actor = await requireActor();
  if (actor instanceof Response) return actor;
  const memberId = actor.kind === "user" ? actor.member.id : null;
  try {
    const pool = getPool();
    const past = `
      WITH t AS (
        SELECT * FROM triplan.trips t
         WHERE coalesce(t.end_date, t.start_date) < current_date
           AND ($1::uuid IS NULL OR t.owner_id = $1
                OR EXISTS (SELECT 1 FROM triplan.trip_members tm WHERE tm.trip_id = t.id AND tm.member_id = $1))
      )`;
    const [trips, places] = await Promise.all([
      pool.query<Row>(
        `${past}
         SELECT t.id, t.title, t.continent, t.country, t.region, t.start_date, t.end_date,
                (SELECT count(*)::int FROM triplan.map_points p WHERE p.trip_id = t.id AND p.day_number IS NOT NULL) AS place_count,
                (SELECT coalesce(sum(e.amount_krw), 0)::float FROM triplan.expenses e WHERE e.trip_id = t.id) AS spend_krw
           FROM t ORDER BY t.start_date DESC`,
        [memberId]
      ),
      pool.query<Row>(
        `${past}
         SELECT p.id, p.trip_id, p.name, p.category, p.color, p.lat, p.lng, p.rating, p.review,
                t.title AS trip_title, t.country, t.region, t.start_date
           FROM triplan.map_points p JOIN t ON t.id = p.trip_id
          WHERE p.rating IS NOT NULL OR p.review IS NOT NULL
          ORDER BY p.rating DESC NULLS LAST, t.start_date DESC`,
        [memberId]
      ),
    ]);
    return Response.json({ trips: trips.rows, places: places.rows });
  } catch (err) {
    console.error("GET /api/archive failed:", err);
    return jsonError("여행 기록을 불러오지 못했어요.");
  }
}
