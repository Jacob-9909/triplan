import type { MapPoint, RouteLeg } from "@/lib/types";

/** 첫 장소에 도착 시각이 없을 때 하루 시작 시각 */
export const DEFAULT_DAY_START = 9 * 60;
/** 머무는 시간이 없을 때 기본값(분) */
export const DEFAULT_STAY = 60;

export interface StopTime {
  /** 도착(분, 0시 기준) */
  arrive: number;
  /** 출발(분) */
  leave: number;
  /** 지정한 도착 시각까지 기다리는 시간(분) */
  wait: number;
  /** 도착 시각을 직접 지정했는지 */
  fixed: boolean;
  /** 지정한 시각보다 늦게 도착하는지(앞 일정이 밀림) */
  late: number;
}

/** "HH:MM" 또는 "HH:MM:SS" → 분 */
export function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** 분 → "HH:MM" (24시를 넘으면 다음 날로 표시) */
export function formatTime(min: number): string {
  const day = Math.floor(min / 1440);
  const t = ((min % 1440) + 1440) % 1440;
  const hh = String(Math.floor(t / 60)).padStart(2, "0");
  const mm = String(t % 60).padStart(2, "0");
  return `${day > 0 ? "+1 " : ""}${hh}:${mm}`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

/** 하루 장소(방문 순서대로)에서 바로 이웃한 장소 사이의 구간만. 순서를 바꾸면 예전 구간은 빠진다 */
export function adjacentLegs(dayPoints: MapPoint[], legs: RouteLeg[]): RouteLeg[] {
  const out: RouteLeg[] = [];
  for (let i = 0; i < dayPoints.length - 1; i++) {
    const leg = legs.find((l) => l.from_point_id === dayPoints[i].id && l.to_point_id === dayPoints[i + 1].id);
    if (leg) out.push(leg);
  }
  return out;
}

/**
 * 하루 일정의 도착·출발 시각 계산.
 * - 첫 장소: 지정 시각 또는 09:00
 * - 다음 장소: 앞 장소 출발 + 이동 시간. 지정 시각이 더 늦으면 그때까지 대기
 */
export function buildSchedule(points: MapPoint[], legs: RouteLeg[]): Map<string, StopTime> {
  const out = new Map<string, StopTime>();
  let prevLeave: number | null = null;
  points.forEach((p, i) => {
    const fixedAt = parseTime(p.start_time);
    let arrive: number;
    let wait = 0;
    let late = 0;
    if (prevLeave === null) {
      arrive = fixedAt ?? DEFAULT_DAY_START;
    } else {
      const leg = legs.find((l) => l.from_point_id === points[i - 1].id && l.to_point_id === p.id);
      const reach = prevLeave + (leg?.duration_min ?? 0);
      if (fixedAt !== null && fixedAt > reach) {
        wait = fixedAt - reach;
        arrive = fixedAt;
      } else {
        if (fixedAt !== null) late = reach - fixedAt;
        arrive = reach;
      }
    }
    const leave = arrive + (p.stay_min ?? DEFAULT_STAY);
    out.set(p.id, { arrive, leave, wait, fixed: fixedAt !== null, late });
    prevLeave = leave;
  });
  return out;
}
