// 캘린더(.ics) 자체 점검: node src/features/calendar/ics.check.ts
import assert from "node:assert/strict";
import { addDays, buildIcs, escapeText, foldLine, localAt, tripEvents, type CalPoint } from "./ics.ts";

const bytes = (s: string) => Buffer.byteLength(s, "utf8");

// 이스케이프: 역슬래시·세미콜론·쉼표·줄바꿈
assert.equal(escapeText("a\\b;c,d\ne\r\nf"), "a\\\\b\\;c\\,d\\ne\\nf");

// 접기: 75옥텟 이하, 이어지는 줄은 공백으로 시작, 한글을 중간에서 자르지 않는다
const long = "DESCRIPTION:" + "가나다라마바사아자차카타파하".repeat(8);
const folded = foldLine(long);
const parts = folded.split("\r\n");
assert.ok(parts.length > 1);
for (const [i, part] of parts.entries()) {
  assert.ok(bytes(part) <= 75, `줄 ${i} 이 ${bytes(part)}옥텟`);
  if (i > 0) assert.equal(part[0], " ");
  assert.ok(!part.includes("�"));
}
assert.equal(parts.map((p, i) => (i ? p.slice(1) : p)).join(""), long);
// 짧은 줄은 그대로, 정확히 75옥텟도 그대로
assert.equal(foldLine("SUMMARY:hi"), "SUMMARY:hi");
assert.equal(foldLine("X".repeat(75)), "X".repeat(75));
assert.equal(foldLine("X".repeat(76)), "X".repeat(75) + "\r\n X");
// 이모지(4바이트)도 쪼개지 않는다
for (const part of foldLine("S:" + "🗼".repeat(40)).split("\r\n")) assert.ok(bytes(part) <= 75);

// 날짜 계산: 월말·24시 넘김
assert.equal(addDays("2026-11-30", 1), "2026-12-01");
assert.equal(localAt("2026-11-19", 9 * 60 + 30), "2026-11-19T09:30");
assert.equal(localAt("2026-11-19", 25 * 60), "2026-11-20T01:00");

// 여행 → 일정
type P = CalPoint;
const pt = (id: string, day: number | null, order: number | null, extra: Partial<P> = {}): P => ({
  id,
  name: `place ${id}`,
  memo: null,
  lat: 35.6895,
  lng: 139.6917,
  day_number: day,
  visit_order: order,
  ...extra,
});
const points = [
  pt("b", 1, 2),
  pt("a", 1, 1, { memo: "줄 서기, 30분", link_url: "https://example.com/a" }),
  pt("c", 2, 1),
  pt("bin", null, null),
];
// 단순 일정: 첫 장소 09:00, 머무는 60분, 이동 0분
const schedule = (day: P[]) => new Map(day.map((p, i) => [p.id, { arrive: 540 + i * 60, leave: 600 + i * 60 }]));
const docs = [
  { id: "f", type: "flight", title: "KE719", provider: "대한항공", confirmation_code: "X7K2QP", url: "https://air.example/x", starts_at: "2026-11-19", ends_at: "2026-11-19" },
  { id: "h", type: "hotel", title: "Hotel", provider: null, confirmation_code: "884120", url: null, starts_at: "2026-11-19", ends_at: "2026-11-22" },
  { id: "t", type: "ticket", title: "Show", provider: null, confirmation_code: null, url: null, starts_at: "2026-11-20T10:00:00Z", ends_at: null },
  { id: "p", type: "passport", title: "Passport", provider: null, confirmation_code: null, url: null, starts_at: "2020-01-01", ends_at: "2030-01-01" },
];
const trip = { id: "T1", title: "도쿄; 가을, 여행", start_date: "2026-11-19", end_date: "2026-11-22", region: "도쿄", country: "일본" };
const now = new Date(Date.UTC(2026, 10, 6, 12, 0, 0));

const events = tripEvents({ trip, points, docs, schedule, showPrivate: true });
const ics = buildIcs({ name: trip.title, events, now });

// 줄 끝은 모두 CRLF, 75옥텟 이하
assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
assert.ok(!/[^\r]\n/.test(ics));
for (const line of ics.split("\r\n")) assert.ok(bytes(line) <= 75);
const unfolded = ics.replace(/\r\n /g, "");

assert.match(unfolded, /X-WR-CALNAME:도쿄\\; 가을\\, 여행\r\n/);
assert.match(unfolded, /REFRESH-INTERVAL;VALUE=DURATION:PT6H\r\n/);
assert.match(unfolded, /X-PUBLISHED-TTL:PT6H\r\n/);
assert.match(unfolded, /DTSTAMP:20261106T120000Z\r\n/);
// 여행 전체: 끝나는 날 다음 날(미포함)
assert.match(unfolded, /UID:trip-T1@triplan\r\nDTSTAMP:\w+\r\nDTSTART;VALUE=DATE:20261119\r\nDTEND;VALUE=DATE:20261123\r\n/);
// 장소: 방문 순서대로 Day 날짜에 현지 시각(Z·TZID 없음)
assert.match(unfolded, /UID:point-a@triplan\r\nDTSTAMP:\w+\r\nDTSTART:20261119T090000\r\nDTEND:20261119T100000\r\n/);
assert.match(unfolded, /UID:point-b@triplan\r\nDTSTAMP:\w+\r\nDTSTART:20261119T100000\r\nDTEND:20261119T110000\r\n/);
assert.match(unfolded, /UID:point-c@triplan\r\nDTSTAMP:\w+\r\nDTSTART:20261120T090000\r\n/);
assert.ok(!unfolded.includes("TZID"));
assert.match(unfolded, /GEO:35.6895;139.6917\r\n/);
assert.match(unfolded, /DESCRIPTION:줄 서기\\, 30분\\nhttps:\/\/example.com\/a\\nDay 1\r\n/);
// 후보함·여권은 빠진다
assert.ok(!unfolded.includes("point-bin@"));
assert.ok(!unfolded.includes("doc-p@"));
// 날짜만 있는 예약은 종일, 끝나는 날까지 포함
assert.match(unfolded, /UID:doc-h@triplan\r\nDTSTAMP:\w+\r\nDTSTART;VALUE=DATE:20261119\r\nDTEND;VALUE=DATE:20261123\r\n/);
// 시각이 있는 예약은 UTC, 끝이 없으면 1시간
assert.match(unfolded, /UID:doc-t@triplan\r\nDTSTAMP:\w+\r\nDTSTART:20261120T100000Z\r\nDTEND:20261120T110000Z\r\n/);
// 편집 링크: 예약번호·링크 포함
assert.match(unfolded, /DESCRIPTION:대한항공\\n예약번호 X7K2QP\\nhttps:\/\/air.example\/x\r\n/);
assert.equal((unfolded.match(/BEGIN:VEVENT/g) ?? []).length, 1 + 3 + 3);

// 보기 링크: 예약번호·예약 링크를 뺀다
const viewIcs = buildIcs({ name: trip.title, events: tripEvents({ trip, points, docs, schedule, showPrivate: false }), now }).replace(/\r\n /g, "");
assert.ok(!viewIcs.includes("X7K2QP"));
assert.ok(!viewIcs.includes("884120"));
assert.ok(!viewIcs.includes("air.example"));
assert.match(viewIcs, /DESCRIPTION:대한항공\r\n/);

// 번역 함수를 넘기면 라벨이 바뀐다
const en = tripEvents({ trip, points, docs, schedule, showPrivate: true, t: (_k, v) => `Confirmation ${v?.code}` });
assert.ok(en.some((e) => e.description?.includes("Confirmation X7K2QP")));

// 날짜 없는 여행: 장소 일정 없이 시각·날짜가 있는 예약만
const undated = tripEvents({ trip: { ...trip, start_date: null, end_date: null }, points, docs, schedule, showPrivate: true });
assert.deepEqual(undated.map((e) => e.uid), ["doc-f@triplan", "doc-h@triplan", "doc-t@triplan"]);

// 같은 입력이면 같은 문서 (UID 가 안정적이라 구독한 캘린더가 중복을 만들지 않는다)
assert.equal(buildIcs({ name: trip.title, events: tripEvents({ trip, points, docs, schedule, showPrivate: true }), now }), ics);

console.log("ics ok");
