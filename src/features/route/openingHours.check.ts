// 영업시간 읽기 자체 점검: node src/features/route/openingHours.check.ts
import assert from "node:assert/strict";
import { formatRanges, hoursOn, osmWeekday, parseOpeningHours, visitProblem } from "./openingHours.ts";

const h = (s: string) => {
  const r = parseOpeningHours(s);
  assert.ok(r, `should parse: ${s}`);
  return r;
};

// 평일·토요일·일요일 휴무
const week = h("Mo-Fr 09:00-18:00; Sa 10:00-14:00; Su off");
assert.deepEqual(hoursOn(week, 0), [[540, 1080]]);
assert.deepEqual(hoursOn(week, 5), [[600, 840]]);
assert.deepEqual(hoursOn(week, 6), []);
assert.equal(visitProblem(week, 6, 600, 660), "closed");
assert.equal(visitProblem(week, 0, 600, 660), null);
assert.equal(visitProblem(week, 5, 780, 900), "outside", "토요일 14시 넘김");

// 요일 없는 규칙 = 매일, 점심·저녁 두 시간대
const lunch = h("11:30-14:00,17:00-22:00");
assert.equal(visitProblem(lunch, 3, 15 * 60, 16 * 60), "outside", "브레이크 타임");
assert.equal(visitProblem(lunch, 3, 18 * 60, 19 * 60), null);
assert.equal(formatRanges(hoursOn(lunch, 3)!), "11:30–14:00, 17:00–22:00");

// 뒤 규칙이 앞 규칙을 덮는다, 주를 넘는 범위, 쉼표 요일
const override = h("Mo-Su 10:00-20:00; We off; Fr-Mo 09:00-21:00");
assert.deepEqual(hoursOn(override, 2), []);
assert.deepEqual(hoursOn(override, 0), [[540, 1260]]);
assert.deepEqual(hoursOn(override, 1), [[600, 1200]]);
assert.deepEqual(h("Tu,Th 12:00-13:00")[0].days, [1, 3]);

// 자정 넘김: 금요일 18시~토요일 2시, 토요일 새벽 1시는 열려 있다
const bar = h("Fr 18:00-02:00");
assert.equal(visitProblem(bar, 4, 23 * 60, 24 * 60 + 30), null);
assert.equal(visitProblem(bar, 5, 60, 90), null, "전날 밤에서 이어짐");
assert.equal(formatRanges(hoursOn(bar, 4)!), "18:00–02:00");

// 24/7, 공휴일 규칙은 건너뜀, 규칙에 없는 요일은 모름
assert.equal(visitProblem(h("24/7"), 6, 0, 1440), null);
assert.equal(hoursOn(h("Mo-Fr 09:00-17:00; PH off"), 6), null);
assert.equal(visitProblem(h("Mo-Fr 09:00-17:00"), 6, 600, 660), null);

// 못 읽는 꼴은 null (원문만 보여 준다)
for (const s of ["", "sunrise-sunset", "Mo-Fr 09:00-17:00; Jan off", "Mo 9am-5pm", "week 1-53 Mo 10:00-12:00"]) {
  assert.equal(parseOpeningHours(s), null, `should not parse: ${s}`);
}

assert.equal(osmWeekday(0), 6, "일요일");
assert.equal(osmWeekday(1), 0, "월요일");
console.log("openingHours ok");
