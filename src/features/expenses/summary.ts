/**
 * 가계부 요약 계산 (화면과 떼어 자체 점검할 수 있게).
 * 여행 일수는 박(nights)이 아니라 일(days): 3박 4일이면 4일.
 * 일평균은 여행 기간 안에서 쓴 돈만 나눈다. 출발 전에 결제한 항공권·숙소, 날짜가 없는 지출,
 * 여행이 끝난 뒤 지출은 "여행 밖"으로 따로 보여 준다 (예전에는 일평균에 섞여 크게 부풀었다).
 */

export interface SummaryExpense {
  amount_krw: number;
  day_number: number | null;
  spent_at: string | null;
}

const DAY_MS = 86_400_000;

/** "yyyy-MM-dd…" 를 그날 0시(로컬)로 */
function dayStart(s: string) {
  return new Date(`${s.slice(0, 10)}T00:00:00`).getTime();
}

/** 여행 일수 (날짜가 없으면 null) */
export function tripDayCount(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  return Math.max(1, Math.round((dayStart(end) - dayStart(start)) / DAY_MS) + 1);
}

/**
 * 지출이 여행 몇째 날인지. 여행 기간 밖이면 null.
 * 날짜(spent_at)를 적었으면 날짜가 기준이다: 지출을 적을 때 보고 있던 Day(day_number)보다 정확하다.
 * 날짜가 없으면 Day 번호를 쓴다
 */
export function expenseDay(e: SummaryExpense, start: string | null | undefined, days: number | null): number | null {
  if (e.spent_at && start) {
    const day = Math.round((dayStart(e.spent_at) - dayStart(start)) / DAY_MS) + 1;
    return day >= 1 && (days == null || day <= days) ? day : null;
  }
  if (e.day_number != null && e.day_number >= 1 && (days == null || e.day_number <= days)) return e.day_number;
  return null;
}

export function summarize(expenses: SummaryExpense[], start?: string | null, end?: string | null) {
  const known = tripDayCount(start, end);
  const byDayMap = new Map<number, number>();
  let total = 0;
  let outside = 0;
  for (const e of expenses) {
    total += e.amount_krw;
    const day = expenseDay(e, start, known);
    if (day == null) outside += e.amount_krw;
    else byDayMap.set(day, (byDayMap.get(day) ?? 0) + e.amount_krw);
  }
  // 날짜 없는 여행은 지출이 있는 마지막 Day 까지
  const days = known ?? Math.max(1, ...byDayMap.keys());
  const inTrip = total - outside;
  return {
    totalKrw: total,
    /** 여행 기간 안에서 쓴 돈 */
    tripKrw: inTrip,
    /** 출발 전 결제·날짜 없음·여행 뒤 */
    outsideKrw: outside,
    days,
    avgDaily: Math.round(inTrip / days),
    byDay: Array.from({ length: days }, (_, i) => ({ day: i + 1, krw: byDayMap.get(i + 1) ?? 0 })),
  };
}
