// 교통 탭 자체 점검: node src/features/trip/transport.check.ts
import assert from "node:assert/strict";
import type { MapPoint, RouteLeg } from "@/lib/types";
import { dayMoves, movePays, nextMoveOptions, parseJourney, payTotals, yenRange } from "./transport.ts";

const pt = (id: string, category: MapPoint["category"], memo: string | null = null) => ({ id, name: id, category, memo }) as MapPoint;
const leg = (from: string, to: string, method: RouteLeg["method"], duration_min: number) =>
  ({ id: `${from}-${to}`, from_point_id: from, to_point_id: to, method, duration_min }) as RouteLeg;
const stop = (point: MapPoint, arrive: number, leave: number) => ({ point, arrive, leave, wait: 0, fixed: true, late: 0 });

const stay = pt("stay", "stay");
const train = pt("train", "transport");
const temple = pt("temple", "culture", "입장료 1,000엔. 다음 이동 → 기요미즈데라: ① 택시 약 1,500엔 ② 시버스 230엔.");
const lunch = pt("lunch", "food");
const cafe = pt("cafe", "cafe");

// 열차(교통 장소), 택시, 숙소로 가는 대중교통만. 열차 뒤 구간·짧은 도보·숙소에서 나서는 6분 도보는 빠진다
const moves = dayMoves({
  stops: [stop(train, 435, 506), stop(temple, 520, 595), stop(lunch, 610, 670), stop(cafe, 675, 720)],
  legs: [leg("train", "temple", "transit", 14), leg("temple", "lunch", "taxi", 15), leg("lunch", "cafe", "walk", 5)],
  start: { point: stay, leg: leg("stay", "train", "walk", 6), leave: 429 },
  end: { point: stay, leg: leg("cafe", "stay", "transit", 60), arrive: 780 },
});
assert.deepEqual(
  moves.map((m) => (m.kind === "ride" ? `ride:${m.point.id}` : `${m.leg.method}:${m.from.id}>${m.to.id}`)),
  ["ride:train", "taxi:temple>lunch", "transit:cafe>stay"]
);
assert.equal(moves[1].at, 595);
assert.equal(moves[1].end, 610);
// 긴 도보는 이동으로 친다
assert.equal(
  dayMoves({ stops: [stop(lunch, 600, 660), stop(cafe, 680, 700)], legs: [leg("lunch", "cafe", "walk", 20)], start: null, end: null }).length,
  1
);

// 메모 → 단계·요금·나머지
const j = parseJourney(
  "06:05 호텔 출발(도보 약 10분). 06:18 近鉄日本橋 구간준급 → 06:29 西九条 하차 → 06:46 ユニバーサルシティ. IC 580엔(400+180). 한 대 앞: 06:07 → 06:39 아님."
);
assert.deepEqual(j.steps.map((s) => s.time), ["06:05", "06:18", "06:29", "06:46"]);
assert.equal(j.steps[0].text, "호텔 출발(도보 약 10분)");
assert.equal(j.steps[2].text, "西九条 하차");
assert.equal(j.fare, "IC 580엔(400+180)");
assert.equal(j.transfers, 1);
assert.equal(j.rest, "한 대 앞: 06:07 → 06:39 아님.");
// 시각이 가운데 있어도 뽑는다, 화살표가 없으면 전부 나머지
assert.deepEqual(parseJourney("인천 14:50→KIX 16:35. 짐 찾기.").steps, [
  { time: "14:50", text: "인천" },
  { time: "16:35", text: "KIX" },
]);
assert.deepEqual(parseJourney("그냥 메모."), { steps: [], fare: null, transfers: 0, rest: "그냥 메모." });
// 마지막 "하차"는 도착이라 환승으로 세지 않는다
assert.equal(parseJourney("21:10 A → 21:15 B 하차 → 21:38 C 하차, 도보 10분.").transfers, 1);

// "다음 이동" 선택지
assert.deepEqual(nextMoveOptions(temple.memo), { options: ["택시 약 1,500엔", "시버스 230엔"], rest: null });
assert.equal(nextMoveOptions("메모만"), null);

// 결제: 열차는 요금 문장(괄호 속 + 는 내역), 택시·대중교통은 선택지에서 그 수단의 금액
const ride = (memo: string) => ({ kind: "ride" as const, at: 0, end: 1, point: pt("r", "transport", memo) });
assert.deepEqual(movePays(ride("A → B. IC 약 720엔(지하철 240 + 게이한 480).")), [{ kind: "ic", amount: "약 720엔", label: null }]);
assert.deepEqual(movePays(ride("A → B. 이코카 190엔 + 라피트 e티켓.")), [
  { kind: "ic", amount: "190엔", label: null },
  { kind: "ticket", amount: null, label: "라피트 e티켓" },
]);
assert.deepEqual(movePays(ride("메모만.")), []);
const taxi = moves[1];
assert.deepEqual(movePays(taxi), [{ kind: "cash", amount: "약 1,500엔", label: null }]);
const gion = pt("gion", "food", "다음 이동 → 에이칸도: ① 게이한 + 도자이선, 400엔, 약 12분 + 역에서 도보 15분 ② 택시 약 1,300~1,700엔 ③ 도보 35분.");
assert.deepEqual(movePays({ kind: "leg", at: 0, end: 35, leg: leg("gion", "e", "transit", 35), from: gion, to: pt("e", "nature") }), [
  { kind: "ic", amount: "400엔", label: null },
]);
assert.deepEqual(yenRange("약 1,300~1,700엔"), [1300, 1700]);
assert.deepEqual(yenRange("720엔"), [720, 720]);
assert.equal(yenRange(null), null);
const tot = payTotals([
  { kind: "ic", amount: "약 720엔", label: null },
  { kind: "ic", amount: "950엔", label: null },
  { kind: "ic", amount: null, label: null },
  { kind: "cash", amount: "약 1,400~1,800엔", label: null },
  { kind: "ticket", amount: null, label: "라피트 e티켓" },
]);
assert.deepEqual(tot.ic, { count: 3, lo: 1670, hi: 1670 });
assert.deepEqual(tot.cash, { count: 1, lo: 1400, hi: 1800 });
assert.deepEqual(tot.tickets, ["라피트 e티켓"]);

console.log("transport ok");
