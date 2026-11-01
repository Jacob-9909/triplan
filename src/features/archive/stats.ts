import type { Expense, MapPoint, RouteLeg } from "@/lib/types";
import { adjacentLegs } from "@/features/route/schedule";
import { estimateDirections } from "@/features/route/directions";

export interface TripStats {
  places: number;
  /** 하루 동선(이웃한 장소 사이) 거리 합. 거리를 모르는 구간은 추정치 */
  distanceKm: number;
  spendKrw: number;
  /** 하루 평균 지출 (days 가 0 이면 0) */
  perDayKrw: number;
  /** 가장 많이 쓴 날 */
  topDay: { day: number; krw: number } | null;
  /** 가장 많이 쓴 분류 */
  topCategory: { category: Expense["category"]; krw: number } | null;
}

function maxEntry<K>(totals: Map<K, number>): [K, number] | null {
  let best: [K, number] | null = null;
  for (const entry of totals) if (!best || entry[1] > best[1]) best = entry;
  return best;
}

export function tripStats(points: MapPoint[], legs: RouteLeg[], expenses: Expense[], days: number): TripStats {
  let distanceKm = 0;
  const dayNumbers = new Set(points.map((p) => p.day_number).filter((d): d is number => d != null));
  for (const day of dayNumbers) {
    const dayPoints = points
      .filter((p) => p.day_number === day)
      .sort((a, b) => (a.visit_order ?? 99) - (b.visit_order ?? 99));
    for (const leg of adjacentLegs(dayPoints, legs)) {
      if (leg.distance_km != null) {
        distanceKm += leg.distance_km;
        continue;
      }
      const from = dayPoints.find((p) => p.id === leg.from_point_id)!;
      const to = dayPoints.find((p) => p.id === leg.to_point_id)!;
      distanceKm += estimateDirections(from, to, leg.method).distanceKm;
    }
  }

  const byDay = new Map<number, number>();
  const byCategory = new Map<Expense["category"], number>();
  let spendKrw = 0;
  for (const e of expenses) {
    spendKrw += e.amount_krw;
    if (e.day_number != null) byDay.set(e.day_number, (byDay.get(e.day_number) ?? 0) + e.amount_krw);
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount_krw);
  }
  const topDay = maxEntry(byDay);
  const topCategory = maxEntry(byCategory);

  return {
    // 후보함(Day 없음)에 남은 곳은 간 곳으로 세지 않는다
    places: points.filter((p) => p.day_number != null).length,
    distanceKm: Math.round(distanceKm * 10) / 10,
    spendKrw,
    perDayKrw: days > 0 ? Math.round(spendKrw / days) : 0,
    topDay: topDay && { day: topDay[0], krw: topDay[1] },
    topCategory: topCategory && { category: topCategory[0], krw: topCategory[1] },
  };
}
