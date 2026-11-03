// 그날 예약 자체 점검: node src/features/prep/dayDocs.check.ts
import assert from "node:assert/strict";
import type { TravelDoc } from "@/lib/types";
import { docsOnDay } from "./dayDocs.ts";

const doc = (id: string, type: TravelDoc["type"], starts_at: string | null, ends_at: string | null = null): TravelDoc => ({
  id,
  trip_id: "t",
  type,
  title: id,
  provider: null,
  confirmation_code: null,
  url: null,
  starts_at,
  ends_at,
  file_path: null,
});

const docs = [
  doc("hotelA", "hotel", "2026-11-10", "2026-11-12"),
  doc("hotelB", "hotel", "2026-11-12", "2026-11-14"),
  doc("flight", "flight", "2026-11-10"),
  doc("passport", "passport", "2026-11-01", "2030-01-01"),
  doc("undated", "ticket", null),
];
const ids = (date: string) => docsOnDay(docs, date).map((d) => `${d.doc.id}:${d.when}`);

assert.deepEqual(ids("2026-11-10"), ["hotelA:start", "flight:start"]);
assert.deepEqual(ids("2026-11-11"), ["hotelA:during"]);
// 숙소를 옮기는 날: 체크아웃이 먼저
assert.deepEqual(ids("2026-11-12"), ["hotelA:end", "hotelB:start"]);
assert.deepEqual(ids("2026-11-15"), []);

console.log("dayDocs ok");
