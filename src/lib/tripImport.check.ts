// JSON 가져오기 검사 자체 점검: node src/lib/tripImport.check.ts
import assert from "node:assert/strict";
import { parseImport } from "./tripImport.ts";

const t = (key: string, vars?: Record<string, string | number>) =>
  key.replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? `{${k}}`));

const sample = {
  version: 1,
  trip: { title: "요나고", country: "일본", region: "요나고", start_date: "2026-11-25", end_date: "2026-11-27", base_currency: "jpy" },
  days: [
    {
      day: 1,
      area: "요나고역",
      stay: "호텔",
      places: [
        { time: "14:50", stay_min: 60, category: "transport", name: "공항", lat: 35.49335, lng: 133.24283, move: { method: "transit", min: 45 } },
        { time: "16:40", stay_min: 30, category: "stay", name: "호텔", lat: 35.4228, lng: 133.3354 },
        { time: "17:20", stay_min: 30, category: "food", name: "라멘", lat: 35.4229, lng: 133.3356 },
        { time: "19:00", name: "하나카이로", lat: 35.3478, lng: 133.423 },
      ],
    },
  ],
  checklist: ["예약", "예약", ""],
};

// 정상: 통화는 대문자, move 는 그대로, 시각만 있으면 틈과 거리로 걷기·대중교통, 숙소 이름 연결, 준비물 중복 제거
const ok = parseImport(JSON.stringify(sample), t);
assert.deepEqual(ok.errors, []);
const day1 = ok.plan!.days[0];
assert.equal(ok.plan!.trip.base_currency, "JPY");
assert.equal(day1.stay, 1);
assert.deepEqual(day1.legs.map((l) => [l.from, l.method, l.duration_min]), [
  [0, "transit", 45],
  [1, "walk", 10],
  [2, "transit", 70],
]);
assert.deepEqual(ok.plan!.checklist, ["예약"]);

// 코드 울타리째 붙여 넣어도 읽는다
assert.deepEqual(parseImport("```json\n" + JSON.stringify(sample) + "\n```", t).errors, []);

// 겹치는 시각은 경고만
const overlap = structuredClone(sample);
overlap.days[0].places[2].time = "16:50";
const ov = parseImport(overlap, t);
assert.equal(ov.errors.length, 0);
assert.ok(ov.warnings.some((w) => w.includes("겹쳐요")));

// 오류: 좌표 없음, 틀린 시각, 기간 넘는 Day, 중복 Day, 모르는 이동수단
type Loose = { days: { day: number; places: Record<string, unknown>[] }[] };
const bad = structuredClone(sample) as unknown as Loose;
bad.days[0].places[1].lat = undefined;
bad.days[0].places[2].time = "25:00";
bad.days[0].places[0].move = { method: "rocket" };
bad.days.push({ day: 5, places: [] }, { day: 1, places: [] });
const b = parseImport(bad, t);
assert.equal(b.plan, null);
assert.ok(b.errors.some((e) => e.includes("좌표")));
assert.ok(b.errors.some((e) => e.includes("HH:MM")));
assert.ok(b.errors.some((e) => e.includes("여행 기간")));
assert.ok(b.errors.some((e) => e.includes("두 번")));
assert.ok(b.errors.some((e) => e.includes("move.method")));

// JSON 아님 / days 없음
assert.equal(parseImport("{nope", t).plan, null);
assert.equal(parseImport({ trip: {} }, t).plan, null);

console.log("tripImport ok");
