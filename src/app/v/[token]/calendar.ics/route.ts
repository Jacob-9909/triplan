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
    const [trip, points, legs, docs, stays] = await Promise.all([
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
      pool.query<{ day_number: number; stay_point_id: string }>(
        "SELECT day_number, stay_point_id FROM triplan.trip_days WHERE trip_id = $1 AND stay_point_id IS NOT NULL",
        [found.tripId]
      ),
    ]);
    // 전날 밤 숙소가 있으면 하루가 숙소에서 출발한다: 첫 장소 도착은 09:00 + 숙소에서 오는 시간 (일정 화면과 같은 규칙)
    const stayAt = new Map(stays.rows.map((r) => [r.day_number, r.stay_point_id]));
    const lead = (dayPoints: MapPoint[]) => {
      const first = dayPoints[0];
      const stay = first?.day_number ? stayAt.get(first.day_number - 1) : undefined;
      if (!stay || stay === first.id) return 0;
      return legs.rows.find((l) => l.from_point_id === stay && l.to_point_id === first.id)?.duration_min ?? 0;
    };
    if (!trip.rows[0]) return jsonError("not found", 404);
    const events = tripEvents({
      trip: trip.rows[0],
      points: points.rows,
      docs: docs.rows,
      schedule: (dayPoints) => buildSchedule(dayPoints, legs.rows, lead(dayPoints)),
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
