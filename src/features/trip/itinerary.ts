import { addDays, format, parseISO } from "date-fns";
import type { MapPoint, RouteLeg, Trip } from "@/lib/types";
import { sortPointsByOrder } from "@/features/map/sort";
import { estimateDirections } from "@/features/route/directions";
import { adjacentLegs, buildSchedule, DEFAULT_DAY_START } from "@/features/route/schedule";
import { nights } from "@/features/ui/dates";
import type { ExportDay } from "./exportFiles";

/** 숙소에서 첫 장소로 가는(또는 마지막 장소에서 숙소로 오는) 구간. 그날 장소가 없거나 숙소가 곧 그 장소면 leg 는 null */
export interface StayAnchor {
  point: MapPoint;
  leg: RouteLeg | null;
}

/** Day N 의 출발 숙소(N-1 일 밤)와 돌아갈 숙소(N 일 밤) */
export function dayStays(
  day: number,
  dayPoints: MapPoint[],
  stayByNight: Record<number, string>,
  byId: Map<string, MapPoint>,
  legs: RouteLeg[]
): { start: StayAnchor | null; end: StayAnchor | null } {
  const startP = byId.get(stayByNight[day - 1]);
  const endP = byId.get(stayByNight[day]);
  const first = dayPoints[0];
  const last = dayPoints[dayPoints.length - 1];
  const find = (a: string, b: string) => legs.find((l) => l.from_point_id === a && l.to_point_id === b) ?? null;
  return {
    start: startP ? { point: startP, leg: first && first.id !== startP.id ? find(startP.id, first.id) : null } : null,
    end: endP ? { point: endP, leg: last && last.id !== endP.id ? find(last.id, endP.id) : null } : null,
  };
}

/** 하루치 일정: 내보내기 형식 + 그날 구간·숙소와 이동 합계 */
export interface PlanDay extends ExportDay {
  legs: RouteLeg[];
  travelMin: number;
  /** 숙소에서 나서는 시각(분) */
  start: (StayAnchor & { leave: number }) | null;
  /** 숙소에 돌아오는 시각(분). 그날 장소가 없으면 null */
  end: (StayAnchor & { arrive: number | null }) | null;
}

/** Day 1..N 의 일정. 날짜 없는 여행이면 장소가 들어 있는 가장 큰 Day 까지 */
export function planDays(
  trip: Pick<Trip, "start_date" | "end_date">,
  points: MapPoint[],
  legs: RouteLeg[],
  areas: Record<number, string> = {},
  stayByNight: Record<number, string> = {}
): PlanDay[] {
  const count = Math.max((nights(trip) ?? -1) + 1, ...points.map((p) => p.day_number ?? 0));
  const sorted = sortPointsByOrder(points);
  const byId = new Map(points.map((p) => [p.id, p]));
  // 아직 안 열어 본 Day 의 구간은 시간이 비어 있다. 저장하지 않고 직선거리 추정치로 채워 시각을 맞춘다
  const filled = (l: RouteLeg): RouteLeg => {
    const a = byId.get(l.from_point_id);
    const b = byId.get(l.to_point_id);
    return l.duration_min != null || !a || !b ? l : { ...l, duration_min: estimateDirections(a, b, l.method).durationMin };
  };
  const fill = (s: StayAnchor | null) => (s?.leg ? { ...s, leg: filled(s.leg) } : s);
  return Array.from({ length: count }, (_, i) => {
    const day = i + 1;
    const dayPoints = sorted.filter((p) => p.day_number === day);
    const dayLegs = adjacentLegs(dayPoints, legs).map(filled);
    const stays = dayStays(day, dayPoints, stayByNight, byId, legs);
    const start = fill(stays.start);
    const end = fill(stays.end);
    const startTravel = start?.leg?.duration_min ?? 0;
    const endTravel = end?.leg?.duration_min ?? 0;
    const schedule = buildSchedule(dayPoints, dayLegs, startTravel);
    const first = dayPoints[0] && schedule.get(dayPoints[0].id);
    const last = dayPoints.length ? schedule.get(dayPoints[dayPoints.length - 1].id) : undefined;
    return {
      day,
      date: trip.start_date ? format(addDays(parseISO(trip.start_date), i), "yyyy-MM-dd") : null,
      area: areas[day] ?? null,
      stops: dayPoints.map((point) => ({ point, ...schedule.get(point.id)! })),
      legs: dayLegs,
      travelMin: dayLegs.reduce((s, l) => s + (l.duration_min ?? 0), 0) + startTravel + endTravel,
      start: start && { ...start, leave: first ? first.arrive - startTravel : DEFAULT_DAY_START },
      end: end && { ...end, arrive: last ? last.leave + endTravel : null },
    };
  });
}
