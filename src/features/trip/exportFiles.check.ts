// 지도 파일 자체 점검: node src/features/trip/exportFiles.check.ts
import assert from "node:assert/strict";
import type { MapPoint } from "@/lib/types";
import { buildKml, fileName, type ExportDay } from "./exportFiles.ts";

const t = (key: string, vars: Record<string, string | number> = {}) => key.replace(/\{(\w+)\}/g, (_, k) => String(vars[k]));
const pt = (id: string, name: string, extra: Partial<MapPoint> = {}) =>
  ({ id, name, lat: 35.7148, lng: 139.7967, memo: null, link_url: null, ...extra }) as MapPoint;

const days: ExportDay[] = [
  {
    day: 1,
    date: "2026-11-20",
    stops: [
      { point: pt("a", "센소지, 아사쿠사; 본당", { memo: "줄 길다\n아침 일찍" }), arrive: 9 * 60, leave: 10 * 60 },
      // 자정을 넘기는 장소는 다음 날로
      { point: pt("b", "야경 & <바>"), arrive: 23 * 60 + 30, leave: 25 * 60 },
    ],
  },
  { day: 2, date: "2026-11-21", stops: [] },
];
const kml = buildKml({ title: "도쿄 & 오사카", days, bin: [pt("c", "도쿄 타워")], stays: [pt("h", "호텔")] }, t);
assert.equal((kml.match(/<Folder>/g) ?? []).length, 3, "빈 Day 는 폴더를 만들지 않는다 (Day 1 + 숙소 + 후보함)");
assert.ok(kml.indexOf("<name>숙소</name>") < kml.indexOf("<name>후보함</name>"));
assert.ok(kml.includes("<name>도쿄 &amp; 오사카</name>"));
assert.ok(kml.includes("<name>2. 야경 &amp; &lt;바&gt;</name>"));
assert.ok(kml.includes("<coordinates>139.7967,35.7148,0</coordinates>"));
assert.ok(kml.includes("<name>후보함</name>"));

assert.equal(fileName('도쿄: 3박/4일?', "ics"), "도쿄 3박 4일.ics");
assert.equal(fileName("///", "kml"), "triplan.kml");
console.log("exportFiles ok");
