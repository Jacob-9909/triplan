import { addDays, format, parseISO } from "date-fns";
import type { MapPoint, RouteLeg, Trip } from "@/lib/types";
import { sortPointsByOrder } from "@/features/map/sort";
import { estimateDirections } from "@/features/route/directions";
import { adjacentLegs, buildSchedule } from "@/features/route/schedule";
import { nights } from "@/features/ui/dates";
import type { ExportDay } from "./exportFiles";

/** 하루치 일정: 내보내기 형식 + 그날 구간과 이동 합계 */
export interface PlanDay extends ExportDay {
  legs: RouteLeg[];
  travelMin: number;
}

/** Day 1..N 의 일정. 날짜 없는 여행이면 장소가 들어 있는 가장 큰 Day 까지 */
export function planDays(
  trip: Pick<Trip, "start_date" | "end_date">,
  points: MapPoint[],
  legs: RouteLeg[],
  areas: Record<number, string> = {}
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
  return Array.from({ length: count }, (_, i) => {
    const day = i + 1;
    const dayPoints = sorted.filter((p) => p.day_number === day);
    const dayLegs = adjacentLegs(dayPoints, legs).map(filled);
    const schedule = buildSchedule(dayPoints, dayLegs);
    return {
      day,
      date: trip.start_date ? format(addDays(parseISO(trip.start_date), i), "yyyy-MM-dd") : null,
      area: areas[day] ?? null,
      stops: dayPoints.map((point) => ({ point, ...schedule.get(point.id)! })),
      legs: dayLegs,
      travelMin: dayLegs.reduce((s, l) => s + (l.duration_min ?? 0), 0),
    };
  });
}
