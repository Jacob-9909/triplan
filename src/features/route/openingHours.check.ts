// 영업시간 읽기 자체 점검: node src/features/route/openingHours.check.ts
import assert from "node:assert/strict";
import { checkVisit, formatRange, normalizeName, parseOpeningHours, pickOsmPlace, weekdayOf, type OsmPlace } from "./openingHours.ts";

const SUN = 0, MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6;
const h = (hh: number, mm = 0) => hh * 60 + mm;

// 24/7: 매일 하루 종일
const all = parseOpeningHours("24/7")!;
assert.equal(all.length, 7);
assert.ok(all.every((d) => d.length === 1 && d[0][0] === 0 && d[0][1] === 1440));
assert.equal(checkVisit("24/7", SUN, h(23), h(25)).status, "ok");
assert.equal(checkVisit(" 24/7 ; PH off", MON, h(3), h(4)).status, "ok");

// 요일 범위·목록
const wk = parseOpeningHours("Mo-Fr 09:00-18:00")!;
assert.deepEqual(wk[MON], [[h(9), h(18)]]);
assert.deepEqual(wk[FRI], [[h(9), h(18)]]);
assert.deepEqual(wk[SAT], []);
assert.deepEqual(wk[SUN], []);
const mixed = parseOpeningHours("Mo-We,Fr 10:00-16:00")!;
assert.deepEqual([MON, TUE, WED, THU, FRI].map((d) => mixed[d].length), [1, 1, 1, 0, 1]);
const weekend = parseOpeningHours("Sa,Su 10:00-15:00")!;
assert.deepEqual([SAT, SUN, MON].map((d) => weekend[d].length), [1, 1, 0]);

// 주말을 넘어 돌아가는 범위 Fr-Mo
const wrap = parseOpeningHours("Fr-Mo 11:00-20:00")!;
assert.deepEqual([FRI, SAT, SUN, MON, TUE, WED, THU].map((d) => wrap[d].length), [1, 1, 1, 1, 0, 0, 0]);

// 하루 여러 구간, 쉼표 뒤 공백
const lunch = parseOpeningHours("Mo-Fr 09:00-12:00, 13:00-18:00")!;
assert.deepEqual(lunch[TUE], [[h(9), h(12)], [h(13), h(18)]]);
assert.equal(checkVisit("Mo-Fr 09:00-12:00,13:00-18:00", TUE, h(12, 15), h(12, 45)).status, "outside");
assert.equal(checkVisit("Mo-Fr 09:00-12:00,13:00-18:00", TUE, h(13), h(14)).hours, "09:00–12:00, 13:00–18:00");
// 맞닿은 구간은 이어서 본다
assert.equal(checkVisit("Mo 09:00-12:00,12:00-18:00", MON, h(11), h(13)).status, "ok");

// 자정 넘김과 24:00
const night = parseOpeningHours("Mo-Sa 18:00-02:00")!;
assert.deepEqual(night[FRI], [[h(18), h(26)]]);
assert.equal(formatRange(night[FRI][0]), "18:00–02:00");
assert.equal(checkVisit("Mo-Sa 18:00-02:00", FRI, h(23), h(25)).status, "ok");
// 토요일 밤 영업이 일요일 새벽까지 이어진다
assert.equal(checkVisit("Mo-Sa 18:00-02:00", SUN, h(1), h(1, 30)).status, "ok");
// 일요일 밤은 휴무
assert.equal(checkVisit("Mo-Sa 18:00-02:00", SUN, h(20), h(21)).status, "closed-day");
// 자정 넘어 도착하면 다음 날(토) 기준. 금 밤 영업이 토 02:00 까지라 01:00 은 괜찮다
assert.equal(checkVisit("Mo-Sa 18:00-02:00", FRI, h(25), h(25, 30)).status, "ok");
assert.equal(checkVisit("Fr 18:00-02:00", FRI, h(27), h(28)).status, "closed-day");
const late = parseOpeningHours("Mo-Su 10:00-24:00")!;
assert.deepEqual(late[WED], [[h(10), 1440]]);
assert.equal(formatRange(late[WED][0]), "10:00–24:00");
assert.equal(checkVisit("Mo-Su 10:00-24:00", WED, h(22), h(24)).status, "ok");
assert.equal(checkVisit("Mo-Su 00:00-24:00", WED, h(0), h(24)).status, "ok");

// 뒤 규칙이 같은 요일을 덮어쓴다
const over = parseOpeningHours("Mo-Su 09:00-18:00; Sa 10:00-14:00; Su off")!;
assert.deepEqual(over[SAT], [[h(10), h(14)]]);
assert.deepEqual(over[SUN], []);
assert.deepEqual(over[MON], [[h(9), h(18)]]);
assert.deepEqual(parseOpeningHours("Mo-Fr 09:00-17:00; We closed")![WED], []);
// 요일 없는 시간 = 매일, 그 뒤 규칙이 덮어쓴다
const every = parseOpeningHours("10:00-20:00; Tu off")!;
assert.deepEqual(every[SUN], [[h(10), h(20)]]);
assert.deepEqual(every[TUE], []);
// 쉼표로 이어 붙인 규칙은 덮어쓰지 않고 더한다
const plus = parseOpeningHours("Mo-Fr 09:00-18:00, Sa 10:00-14:00")!;
assert.deepEqual(plus[FRI], [[h(9), h(18)]]);
assert.deepEqual(plus[SAT], [[h(10), h(14)]]);
assert.deepEqual(plus[SUN], []);

// PH 규칙은 무시, 요일과 섞인 PH 는 빼고 본다
const ph = parseOpeningHours("Mo-Fr 09:00-18:00; PH off")!;
assert.deepEqual(ph[MON], [[h(9), h(18)]]);
assert.deepEqual(parseOpeningHours("Mo-Fr 09:00-18:00; PH 10:00-12:00")![MON], [[h(9), h(18)]]);
const wph = parseOpeningHours("Mo-Fr 09:00-18:00; Sa,Su,PH 10:00-16:00")!;
assert.deepEqual(wph[SUN], [[h(10), h(16)]]);
assert.deepEqual(wph[MON], [[h(9), h(18)]]);

// 대소문자, 한 자리 시, en dash
assert.deepEqual(parseOpeningHours("mo-fr 9:00–17:30")![MON], [[h(9), h(17, 30)]]);

// checkVisit 상태
const MUSEUM = "Tu-Su 09:00-17:00";
assert.deepEqual(checkVisit(MUSEUM, MON, h(10), h(11)), { status: "closed-day" });
assert.deepEqual(checkVisit(MUSEUM, TUE, h(10), h(11)), { status: "ok", hours: "09:00–17:00" });
assert.deepEqual(checkVisit(MUSEUM, TUE, h(8, 30), h(9, 30)), { status: "outside", hours: "09:00–17:00" });
assert.deepEqual(checkVisit(MUSEUM, TUE, h(16), h(18)), { status: "outside", hours: "09:00–17:00" });
// 닫는 시각에 맞춰 떠나는 건 괜찮다
assert.equal(checkVisit(MUSEUM, TUE, h(16), h(17)).status, "ok");
assert.equal(checkVisit(MUSEUM, TUE, h(9), h(10)).status, "ok");
assert.equal(checkVisit(MUSEUM, TUE, h(17), h(17, 30)).status, "outside");

// 모르는 형식은 짐작하지 않고 unknown
for (const bad of [
  null,
  undefined,
  "",
  "   ",
  "Mo-Fr 09:00-18:00; Dec 25 off",
  "Jan-Mar Mo-Fr 09:00-17:00",
  "2024 Mo-Fr 09:00-17:00",
  "week 01-26 Mo 10:00-12:00",
  "sunrise-sunset",
  "Mo-Fr 10:00+",
  "Mo-Fr 09:00-18:00 \"by appointment\"",
  "Mo[1] 09:00-12:00",
  "Mo-Fr 09:00-17:00 || \"call\"",
  "Mo-Fr",
  "Mon-Fri 09:00-17:00",
  "Mo-Fr 25:00-26:00",
  "Mo-Fr 09:60-17:00",
  "SH off",
  "Mo-Fr 09:00-",
  "영업시간 9시~6시",
  "x".repeat(201),
]) {
  assert.equal(parseOpeningHours(bad), null, `should be unknown: ${bad}`);
  assert.deepEqual(checkVisit(bad, MON, h(10), h(11)), { status: "unknown" });
}
assert.equal(checkVisit("Mo-Fr 09:00-18:00; Dec 25 off", SUN, h(10), h(11)).status, "unknown");

// 날짜 → 요일 (시간대 상관없이)
assert.equal(weekdayOf("2026-11-06"), FRI);
assert.equal(weekdayOf("2026-11-08"), SUN);
assert.equal(weekdayOf("nope"), null);

// OSM 장소 고르기
assert.equal(normalizeName("  Tokyo  Skytree! "), normalizeName("tokyo-skytree"));
const at = { lat: 35.7148, lng: 139.7967 };
const place = (tags: Record<string, string>, dLat = 0): OsmPlace => ({ tags, lat: at.lat + dLat, lng: at.lng });
const shop = place({ name: "Lawson", opening_hours: "24/7" }, 0.0001);
const temple = place({ name: "浅草寺", "name:ko": "센소지", "name:en": "Sensō-ji", opening_hours: "06:00-17:00" }, 0.0005);
assert.equal(pickOsmPlace([shop, temple], "센소지", at), temple);
assert.equal(pickOsmPlace([shop, temple], "Sensō-ji", at), temple);
assert.equal(pickOsmPlace([shop, temple], "浅草寺", at), temple);
// 한쪽이 다른 쪽을 품으면 맞는 것으로
assert.equal(pickOsmPlace([shop, temple], "아사쿠사 센소지", at), temple);
// 정확히 같은 이름이 품는 이름보다 먼저, 같으면 가까운 쪽
const far = place({ name: "센소지 기념품점", opening_hours: "10:00-18:00" }, 0.0001);
assert.equal(pickOsmPlace([far, temple], "센소지", at), temple);
const near2 = place({ name: "Sensoji", opening_hours: "Mo 10:00-11:00" }, 0.0002);
const far2 = place({ name: "Sensoji", opening_hours: "Mo 12:00-13:00" }, 0.0006);
assert.equal(pickOsmPlace([far2, near2], "sensoji", at), near2);
// 이름이 안 맞으면 25 m 안에 딱 하나일 때만
assert.equal(pickOsmPlace([shop], "모르는 곳", at), shop);
assert.equal(pickOsmPlace([shop, place({ name: "7-Eleven", opening_hours: "24/7" }, -0.0001)], "모르는 곳", at), null);
assert.equal(pickOsmPlace([temple], "모르는 곳", at), null);
assert.equal(pickOsmPlace([], "센소지", at), null);
// opening_hours 없는 후보는 빼고 본다
assert.equal(pickOsmPlace([place({ name: "센소지" })], "센소지", at), null);

console.log("openingHours ok");
