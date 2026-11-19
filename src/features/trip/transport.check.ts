// 교통 탭 자체 점검: node src/features/trip/transport.check.ts
import assert from "node:assert/strict";
import type { MapPoint, RouteLeg } from "@/lib/types";
import {
  boardingStep,
  dayMoves,
  legPays,
  memoBeforeNextMove,
  movePays,
  nextMove,
  nextMoveOptions,
  parseJourney,
  payTotals,
  upcomingStep,
  yenRange,
} from "./transport.ts";

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

// 장소 카드 메모에서는 "다음 이동" 부분을 뺀다
assert.equal(memoBeforeNextMove(temple.memo), "입장료 1,000엔.");
assert.equal(memoBeforeNextMove("다음 이동 → A: ① 택시"), null);
assert.equal(memoBeforeNextMove("메모만"), "메모만");
assert.equal(memoBeforeNextMove(null), null);

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
// 신용카드 터치 요금은 카드·현금으로
assert.deepEqual(movePays(ride("A → B. 카드 터치 190엔 + 라피트 e티켓.")), [
  { kind: "cash", amount: "190엔", label: null },
  { kind: "ticket", amount: null, label: "라피트 e티켓" },
]);
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

assert.equal(tot.cashLabel, null);

// 택시 선택지에 GO 가 있으면 GO 로, 모든 카드·현금이 GO 면 합계도 GO
const goMemo = "다음 이동 → 기요미즈데라: ① 택시(GO 앱 호출·GO Pay) 약 1,400~1,800엔 + 호출 요금 0~500엔(약 3km) ② 시버스 230엔.";
assert.deepEqual(legPays({ method: "taxi" }, { memo: goMemo }), [{ kind: "cash", amount: "약 1,400~1,800엔", label: "GO" }]);
assert.deepEqual(legPays({ method: "walk" }, { memo: goMemo }), []);
assert.equal(payTotals(legPays({ method: "taxi" }, { memo: goMemo })).cashLabel, "GO");

// 처음 타는 단계: "…행" 이 붙은 첫 단계, 없으면 시각이 있는 첫 단계
const morning = parseJourney("07:05 호텔 출발(도보 약 6분). 07:15 恵美須町 사카이스지선 北千里행 → 07:22 北浜 하차 → 07:29 京阪 특급 出町柳행 → 08:26 東福寺.");
assert.deepEqual(boardingStep(morning.steps), { time: "07:15", text: "恵美須町 사카이스지선 北千里행" });
assert.deepEqual(boardingStep(parseJourney("17:35 간사이공항 라피트 β70호 → 18:12 天下茶屋 하차.").steps), {
  time: "17:35",
  text: "간사이공항 라피트 β70호",
});
assert.equal(boardingStep([]), null);

// 다음 이동: 타고 있는 이동, 아니면 90분 안에 시작하는 이동. 도보는 뺀다
const walkLeg = { ...moves[1], leg: leg("temple", "lunch", "walk", 20), at: 500, end: 520 } as (typeof moves)[number];
assert.equal(nextMove(moves, 430)?.phase, "soon");
assert.equal(nextMove(moves, 430)?.minutes, 5);
assert.equal(nextMove(moves, 450)?.phase, "riding");
assert.equal(nextMove(moves, 450)?.minutes, 56);
assert.equal(nextMove(moves, 300), null); // 2시간 넘게 남음
assert.equal(nextMove([walkLeg], 495), null);

// 지금 이후 첫 단계와 이미 내린 횟수
assert.deepEqual(upcomingStep(morning.steps, 7 * 60 + 25), { index: 3, transfersDone: 1 }); // 07:29 게이한 특급, 北浜 에서 한 번 내림
assert.deepEqual(upcomingStep(morning.steps, 6 * 60), { index: 0, transfersDone: 0 });
assert.equal(upcomingStep(morning.steps, 9 * 60), null);
// 자정을 넘는 단계는 다음 날로 센다
const late = parseJourney("23:50 A 출발 → 00:05 B 하차 → 00:20 C.").steps;
assert.deepEqual(upcomingStep(late, 23 * 60 + 55), { index: 1, transfersDone: 0 });
// 자정을 넘긴 뒤(00:10) 보면 어젯밤 출발한 이동으로 본다
assert.deepEqual(upcomingStep(late, 10), { index: 2, transfersDone: 1 });

console.log("transport ok");
