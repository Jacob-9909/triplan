// AI 답 검사 자체 점검: node src/lib/aiAssist.check.ts
import assert from "node:assert/strict";
import { parseBooking, parseSuggestions } from "./aiAssist.ts";

const reply = (content: string) => ({ choices: [{ message: { content } }] });

// 추천: 이름 없는 것·중복은 버리고, 모르는 분류는 etc, 현지 이름이 없으면 이름으로
const s = parseSuggestions(
  reply(
    JSON.stringify({
      places: [
        { name: "츠키지 장외시장", local: "築地場外市場", category: "food", reason: "아침 해산물" },
        { name: "츠키지 장외시장", local: "築地", category: "food", reason: "중복" },
        { name: "", local: "x", category: "food", reason: "이름 없음" },
        { name: "야나카 긴자", local: "", category: "street", reason: "옛 골목" },
      ],
    })
  )
);
assert.deepEqual(s, [
  { name: "츠키지 장외시장", local: "築地場外市場", category: "food", reason: "아침 해산물" },
  { name: "야나카 긴자", local: "야나카 긴자", category: "etc", reason: "옛 골목" },
]);
// 코드 울타리가 붙은 답도 읽는다. 모양이 틀리면 빈 목록
assert.equal(parseSuggestions(reply('```json\n{"places":[{"name":"A","local":"A","category":"cafe","reason":""}]}\n```')).length, 1);
assert.deepEqual(parseSuggestions(reply("추천해 드릴게요")), []);
assert.deepEqual(parseSuggestions(null), []);
assert.equal(parseSuggestions(reply(JSON.stringify({ places: Array.from({ length: 20 }, (_, i) => ({ name: `P${i}` })) })), 12).length, 12);

// 예약: 날짜 형식·실제 날짜만, 끝이 시작보다 이르면 버림, 예약번호 공백 제거, 모르는 종류는 etc
assert.deepEqual(
  parseBooking(reply(JSON.stringify({ type: "hotel", title: "아사쿠사 뷰 호텔", provider: "아고다", confirmation_code: "AB 12 34", starts_at: "2026-11-20", ends_at: "2026-11-23" }))),
  { type: "hotel", title: "아사쿠사 뷰 호텔", provider: "아고다", confirmation_code: "AB1234", starts_at: "2026-11-20", ends_at: "2026-11-23" }
);
const bad = parseBooking(reply(JSON.stringify({ type: "cruise", title: "배", provider: "", confirmation_code: "", starts_at: "2026-02-30", ends_at: "11/20" })));
assert.deepEqual(bad, { type: "etc", title: "배", provider: "", confirmation_code: "", starts_at: "", ends_at: "" });
assert.equal(parseBooking(reply(JSON.stringify({ type: "flight", title: "x", starts_at: "2026-11-23", ends_at: "2026-11-20" })))?.ends_at, "");
assert.equal(parseBooking(reply(JSON.stringify({ type: "flight", title: "" }))), null);
console.log("aiAssist ok");
