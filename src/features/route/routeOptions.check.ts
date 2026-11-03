// 경로 선택 규칙 자체 점검: node src/features/route/routeOptions.check.ts
import assert from "node:assert/strict";
import type { RouteLeg, RouteOption } from "@/lib/types";
import { autoMethod, chipMethods, defaultMethod, isStale, providerFor } from "./routeOptions.ts";
import { inKorea } from "./directions.ts";

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

// 후쿠오카·쓰시마 등 규슈 북부는 한국 범위 상자 안이지만 한국이 아니다
const hakata = { lat: 33.5902, lng: 130.4207 };
const tsushima = { lat: 34.2, lng: 129.29 };
assert.equal(inKorea(hakata), false);
assert.equal(inKorea(tsushima), false);
assert.equal(inKorea({ lat: 35.1796, lng: 129.0756 }), true); // 부산
assert.equal(inKorea({ lat: 33.4996, lng: 126.5312 }), true); // 제주
assert.equal(providerFor("transit", hakata, { lat: 33.5897, lng: 130.3988 }), null);
assert.equal(providerFor("transit", busan, hakata), null);

// 700m 안쪽은 ODsay 가 경로를 주지 않으므로 묻지 않는다 (하루 30건 아끼기)
assert.equal(providerFor("transit", seoul, { lat: seoul.lat + 0.004, lng: seoul.lng }), null); // 약 450m

// 비행기·배 구간은 비교할 이동수단이 없다
assert.deepEqual(chipMethods({ method: "plane" } as RouteLeg), []);
assert.deepEqual(chipMethods({ method: "ferry" } as RouteLeg), []);

// 기본값을 바꾸는 건 만들 때의 기본값(대중교통)인 구간뿐. 사람이 고른 적 있거나 다른 수단은 그대로
const near = { lat: seoul.lat + 0.0045, lng: seoul.lng };
const far = { lat: seoul.lat + 0.027, lng: seoul.lng };
assert.equal(autoMethod({ method: "transit", method_chosen: false } as RouteLeg, seoul, near), "walk");
assert.equal(autoMethod({ method: "transit", method_chosen: false } as RouteLeg, seoul, far), null);
assert.equal(autoMethod({ method: "transit", method_chosen: true } as RouteLeg, seoul, near), null);
assert.equal(autoMethod({ method: "plane", method_chosen: false } as RouteLeg, seoul, near), null);
assert.equal(autoMethod({ method: "taxi", method_chosen: false } as RouteLeg, seoul, near), null);

console.log("routeOptions ok");
