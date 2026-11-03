// 경로 선택 규칙 자체 점검: node src/features/route/routeOptions.check.ts
import assert from "node:assert/strict";
import type { RouteLeg, RouteOption } from "@/lib/types";
import { chipMethods, defaultMethod, isStale, providerFor } from "./routeOptions.ts";

const seoul = { lat: 37.5663, lng: 126.9779 };
const busan = { lat: 35.1151, lng: 129.0415 };
const tokyoA = { lat: 35.7141, lng: 139.7774 };
const tokyoB = { lat: 35.7148, lng: 139.7967 };

assert.equal(providerFor("transit", seoul, busan), "odsay");
// 한국 밖이거나 나라를 넘는 대중교통은 묻지 않는다
assert.equal(providerFor("transit", seoul, tokyoA), null);
assert.equal(providerFor("transit", tokyoA, tokyoB), null);
assert.equal(providerFor("plane", seoul, busan), null);
assert.equal(providerFor("ferry", seoul, busan), null);
assert.equal(providerFor("walk", tokyoA, tokyoB), "valhalla-pedestrian");
assert.equal(providerFor("taxi", tokyoA, tokyoB), "valhalla-auto");
assert.equal(providerFor("rental-car", tokyoA, tokyoB), "valhalla-auto");
assert.equal(providerFor("bike", tokyoA, tokyoB), "valhalla-bicycle");

// 저장 당시보다 핀이 20m 넘게 옮겨졌으면 다시 받는다
const opt = { from_lat: seoul.lat, from_lng: seoul.lng, to_lat: busan.lat, to_lng: busan.lng } as RouteOption;
assert.equal(isStale(opt, { lat: seoul.lat + 0.00004, lng: seoul.lng }, busan), false); // 약 4m
assert.equal(isStale(opt, { lat: seoul.lat + 0.00045, lng: seoul.lng }, busan), true); // 약 50m

// 걸어서 15분 이하면 도보, 넘으면 대중교통
assert.equal(defaultMethod(seoul, { lat: seoul.lat + 0.0045, lng: seoul.lng }), "walk"); // 약 500m
assert.equal(defaultMethod(seoul, { lat: seoul.lat + 0.027, lng: seoul.lng }), "transit"); // 약 3km

assert.deepEqual(chipMethods({ method: "walk" } as RouteLeg), ["transit", "walk", "taxi"]);
assert.deepEqual(chipMethods({ method: "bike" } as RouteLeg), ["transit", "walk", "taxi", "bike"]);
assert.deepEqual(chipMethods({ method: "rental-car" } as RouteLeg), ["transit", "walk", "taxi", "rental-car"]);
assert.deepEqual(chipMethods({ method: "plane" } as RouteLeg), ["transit", "walk", "taxi"]);

console.log("routeOptions ok");
