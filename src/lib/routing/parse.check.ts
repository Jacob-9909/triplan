// 경로 응답 해석 자체 점검: node src/lib/routing/parse.check.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseValhalla } from "./valhalla.ts";
import { parseOdsay } from "./odsay.ts";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const cityHall = { lat: 37.5663, lng: 126.9779 };
const hongik = { lat: 37.5572, lng: 126.9245 };

// Valhalla: 시청 → 홍대입구 도보
const walk = parseValhalla(fixture("valhalla.json"))!;
assert.ok(walk);
assert.equal(walk.duration_min, 73);
assert.equal(walk.distance_km, 5.559);
assert.equal(walk.steps, null);
assert.ok(walk.shape.length > 2);
assert.ok(Math.abs(walk.shape[0][0] - cityHall.lng) < 0.01 && Math.abs(walk.shape[0][1] - cityHall.lat) < 0.01);
assert.equal(parseValhalla({ error: "No path" }), null);

// ODsay: 걷기 → 2호선 5정거장 → 걷기
const transit = parseOdsay(fixture("odsay.json"), cityHall, hongik)!;
assert.ok(transit);
assert.equal(transit.duration_min, 18);
assert.equal(transit.fare_krw, 1550);
assert.deepEqual(transit.steps!.map((s) => s.mode), ["walk", "subway", "walk"]);
const subway = transit.steps![1];
assert.equal(subway.line, "2호선");
assert.equal(subway.color, "#00a84d");
assert.equal(subway.stops, 5);
assert.equal(subway.from, "시청");
assert.equal(subway.minutes, 11);
assert.equal(subway.shape.length, 6);
// 걷기 단계는 앞뒤 좌표로 잇는다: 출발지 → 시청역
assert.deepEqual(transit.steps![0].shape, [[cityHall.lng, cityHall.lat], [126.975277, 37.563536]]);
// 전체 모양은 단계 모양을 이은 것
assert.deepEqual(transit.shape[0], [cityHall.lng, cityHall.lat]);
assert.deepEqual(transit.shape[transit.shape.length - 1], [hongik.lng, hongik.lat]);
assert.equal(parseOdsay({ error: [{ code: "-98", message: "no result" }] }, cityHall, hongik), null);

console.log("routing parse ok");
