// 가계부 요약 자체 점검: node src/features/expenses/summary.check.ts
import assert from "node:assert/strict";
import { expenseDay, summarize, tripDayCount } from "./summary.ts";

// 3박 4일은 4일 (예전에는 3일로 셌다)
assert.equal(tripDayCount("2026-11-19", "2026-11-22"), 4);
assert.equal(tripDayCount("2026-11-19", "2026-11-19"), 1);
assert.equal(tripDayCount(null, "2026-11-22"), null);

const start = "2026-11-19";
// 날짜가 있으면 날짜 기준: 출발 전 결제는 Day 1 화면에서 적었어도 여행 밖
assert.equal(expenseDay({ amount_krw: 1, day_number: 1, spent_at: "2026-11-06" }, start, 4), null);
assert.equal(expenseDay({ amount_krw: 1, day_number: 1, spent_at: "2026-11-21" }, start, 4), 3);
assert.equal(expenseDay({ amount_krw: 1, day_number: null, spent_at: "2026-11-22T20:00:00" }, start, 4), 4);
assert.equal(expenseDay({ amount_krw: 1, day_number: null, spent_at: "2026-11-23" }, start, 4), null);
// 날짜가 없으면 Day 번호
assert.equal(expenseDay({ amount_krw: 1, day_number: 2, spent_at: null }, start, 4), 2);
assert.equal(expenseDay({ amount_krw: 1, day_number: 9, spent_at: null }, start, 4), null);
assert.equal(expenseDay({ amount_krw: 1, day_number: null, spent_at: null }, start, 4), null);

// 샘플 도쿄 여행: 항공권 84만 원(날짜·Day 없음)은 일평균에서 빠진다
const s = summarize(
  [
    { amount_krw: 60_720, day_number: 1, spent_at: null },
    { amount_krw: 44_160, day_number: 1, spent_at: null },
    { amount_krw: 115_920, day_number: 2, spent_at: null },
    { amount_krw: 840_000, day_number: null, spent_at: null },
  ],
  "2026-11-19",
  "2026-11-22"
);
assert.equal(s.days, 4);
assert.equal(s.totalKrw, 1_060_800);
assert.equal(s.outsideKrw, 840_000);
assert.equal(s.tripKrw, 220_800);
assert.equal(s.avgDaily, 55_200);
assert.deepEqual(
  s.byDay.map((d) => d.krw),
  [104_880, 115_920, 0, 0]
);

// 날짜 없는 여행: 지출이 있는 마지막 Day 까지
const u = summarize([{ amount_krw: 100, day_number: 3, spent_at: null }]);
assert.equal(u.days, 3);
assert.equal(u.avgDaily, 33);
// 지출이 없으면 1일, 평균 0
assert.equal(summarize([], start, "2026-11-22").avgDaily, 0);

console.log("summary ok");
