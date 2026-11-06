import { getPool, jsonError } from "@/lib/db";
import { findTripByToken } from "@/lib/auth";
import type { MapPoint, RouteLeg, TravelDoc } from "@/lib/types";
import { buildSchedule } from "@/features/route/schedule";
import { buildIcs, tripEvents, type CalTrip } from "@/features/calendar/ics";
import { getT } from "@/i18n/server";

/**
 * 여행 일정 캘린더(.ics). 캘린더 앱이 로그인 없이 받아 가므로 공유 토큰(보기·편집)으로 연다.
 * 보기 링크면 예약번호와 예약 링크를 뺀다 (GET /api/travel-docs 와 같은 규칙).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await findTripByToken(token);
  if (!found) return jsonError("not found", 404);
  try {
    const pool = getPool();
    const [trip, points, legs, docs] = await Promise.all([
      pool.query<CalTrip>(
        "SELECT id, title, start_date, end_date, region, country FROM triplan.trips WHERE id = $1",
        [found.tripId]
      ),
      pool.query<MapPoint>(
        "SELECT * FROM triplan.map_points WHERE trip_id = $1 ORDER BY day_number, visit_order, created_at",
        [found.tripId]
      ),
      pool.query<RouteLeg>("SELECT * FROM triplan.route_legs WHERE trip_id = $1", [found.tripId]),
      pool.query<TravelDoc>("SELECT * FROM triplan.travel_docs WHERE trip_id = $1 ORDER BY starts_at", [found.tripId]),
    ]);
    if (!trip.rows[0]) return jsonError("not found", 404);
    const events = tripEvents({
      trip: trip.rows[0],
      points: points.rows,
      docs: docs.rows,
      schedule: (dayPoints) => buildSchedule(dayPoints, legs.rows),
      showPrivate: found.access === "edit",
      t: await getT(),
    });
    return new Response(buildIcs({ name: trip.rows[0].title, events }), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="triplan.ics"',
        // 주소에 토큰이 있으니 공유 캐시엔 두지 않는다. 구독 갱신 주기는 문서 안 REFRESH-INTERVAL 이 정한다
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("GET /v/[token]/calendar.ics failed:", err);
    return jsonError("캘린더를 만들지 못했어요.");
  }
}
