/**
 * OpenStreetMap opening_hours 의 흔한 꼴만 읽는다: "24/7", "Mo-Fr 09:00-18:00; Sa 10:00-14:00; Su off",
 * "10:00-20:00"(요일 없음 = 매일), 여러 시간대 "11:00-14:00,17:00-22:00", 자정 넘김 "18:00-02:00".
 * ponytail: 공휴일(PH)·월·주차·해 뜰 녘 같은 규칙은 못 읽으면 null 을 돌려 원문만 보여 준다. 다 필요하면 opening_hours.js 로 바꾼다
 */

/** 요일 0=월 … 6=일 (OSM 순서) */
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export interface HoursRule {
  days: number[];
  /** [시작, 끝] 분. 끝이 1440 을 넘으면 다음 날 새벽까지 */
  ranges: [number, number][];
}

const TIME = /^([01]?\d|2[0-4]):([0-5]\d)$/;

function minutes(s: string): number | null {
  const m = TIME.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function parseDays(sel: string): number[] | null {
  const out = new Set<number>();
  for (const part of sel.split(",")) {
    const [a, b] = part.split("-");
    const i = DAYS.indexOf(a);
    const j = b === undefined ? i : DAYS.indexOf(b);
    if (i < 0 || j < 0) return null;
    // Fr-Mo 처럼 주를 넘는 범위도 있다
    for (let k = i; ; k = (k + 1) % 7) {
      out.add(k);
      if (k === j) break;
    }
  }
  return [...out].sort();
}

function parseRanges(s: string): [number, number][] | null {
  if (/^(off|closed)$/i.test(s)) return [];
  const out: [number, number][] = [];
  for (const part of s.split(",")) {
    const [a, b] = part.split("-");
    const start = minutes(a ?? "");
    let end = minutes(b ?? "");
    if (start === null || end === null) return null;
    if (end <= start) end += 1440;
    out.push([start, end]);
  }
  return out;
}

/** 읽을 수 없으면 null. 같은 요일에 규칙이 여럿이면 뒤 규칙이 앞 규칙을 덮는다 (OSM 규칙) */
export function parseOpeningHours(raw: string | null | undefined): HoursRule[] | null {
  const s = raw?.trim();
  if (!s) return null;
  if (s === "24/7") return [{ days: [0, 1, 2, 3, 4, 5, 6], ranges: [[0, 1440]] }];
  const rules: HoursRule[] = [];
  for (const chunk of s.split(";").map((c) => c.trim()).filter(Boolean)) {
    // 공휴일 규칙은 날짜를 모르니 건너뛴다
    if (/^PH\b/.test(chunk)) continue;
    const m = /^([A-Z][a-z](?:[-,][A-Z][a-z])*)\s+(.+)$/.exec(chunk);
    const days = m ? parseDays(m[1]) : [0, 1, 2, 3, 4, 5, 6];
    const ranges = parseRanges((m ? m[2] : chunk).replace(/\s+/g, ""));
    if (!days || !ranges) return null;
    rules.push({ days, ranges });
  }
  return rules.length ? rules : null;
}

/** 그 요일(0=월)의 영업 시간대. 빈 배열이면 쉬는 날, null 이면 규칙에 없는 요일(모름) */
export function hoursOn(rules: HoursRule[], weekday: number): [number, number][] | null {
  let found: [number, number][] | null = null;
  for (const r of rules) if (r.days.includes(weekday)) found = r.ranges;
  return found;
}

/** Date.getDay()(0=일) → OSM 요일(0=월) */
export const osmWeekday = (jsDay: number) => (jsDay + 6) % 7;

/**
 * 머무는 동안(arrive~leave, 분) 열려 있는지.
 * closed: 쉬는 날, outside: 영업시간 밖에 걸침, null: 문제 없음이거나 모름
 */
export function visitProblem(rules: HoursRule[], weekday: number, arrive: number, leave: number): "closed" | "outside" | null {
  const ranges = hoursOn(rules, weekday);
  if (ranges === null) return null;
  if (ranges.length === 0) return "closed";
  // 전날 밤부터 이어지는 시간대(자정 넘김)도 오늘 새벽으로 친다
  const prev = hoursOn(rules, (weekday + 6) % 7) ?? [];
  const spans = [...ranges, ...prev.filter(([, e]) => e > 1440).map(([, e]) => [0, e - 1440] as [number, number])];
  return spans.some(([s, e]) => s <= arrive && leave <= e) ? null : "outside";
}

const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** "09:00–18:00, 19:00–22:00" */
export function formatRanges(ranges: [number, number][]): string {
  return ranges.map(([s, e]) => `${hhmm(s)}–${hhmm(e)}`).join(", ");
}
