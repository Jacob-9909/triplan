// 지도 경로 피처 자체 점검: node src/features/map/routeFeatures.check.ts
import assert from "node:assert/strict";
import type { MapPoint, RouteLeg, RouteOption } from "@/lib/types";
import { altFromHits, buildRouteFeatures, ROUTE_ATTRIBUTION } from "./routeFeatures.ts";

const pt = (id: string, lat: number, lng: number) => ({ id, lat, lng }) as MapPoint;
const A = pt("a", 37.5663, 126.9779);
const B = pt("b", 37.5572, 126.9245);
const C = pt("c", 37.55, 126.92);
const leg = (id: string, from: string, to: string, method: RouteLeg["method"]) =>
  ({ id, from_point_id: from, to_point_id: to, method }) as RouteLeg;
const option = (legId: string, method: RouteLeg["method"], from: MapPoint, to: MapPoint, extra: Partial<RouteOption> = {}) =>
  ({
    id: `${legId}-${method}`,
    leg_id: legId,
    method,
    from_lat: from.lat,
    from_lng: from.lng,
    to_lat: to.lat,
    to_lng: to.lng,
    shape: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
    steps: null,
    ...extra,
  }) as RouteOption;

const transit = option("ab", "transit", A, B, {
  steps: [
    { mode: "walk", minutes: 6, shape: [[A.lng, A.lat], [126.9753, 37.5635]] },
    { mode: "subway", minutes: 11, line: "2호선", color: "#00a84d", stops: 5, shape: [[126.9753, 37.5635], [126.924, 37.557]] },
    { mode: "walk", minutes: 1, shape: [[126.924, 37.557], [B.lng, B.lat]] },
  ],
});
const points = [A, B, C];
const legs = [leg("ab", "a", "b", "transit"), leg("bc", "b", "c", "walk")];

// 대중교통 구간은 걷기·탈것 단계로 나뉘고, 갈아타는 곳 점이 생긴다. 경로 없는 구간은 추정 직선 하나
const f = buildRouteFeatures(points, legs, [transit, option("ab", "walk", A, B), option("ab", "taxi", A, B)], null);
const ab = f.lines.features.filter((x) => x.properties.legId === "ab");
assert.equal(ab.length, 3);
assert.equal(ab.filter((x) => x.properties.kind === "vehicle").length, 1);
assert.equal(ab.find((x) => x.properties.kind === "vehicle")!.properties.color, "#00a84d");
assert.ok(f.transfers.features.length >= 1);
const bc = f.lines.features.filter((x) => x.properties.legId === "bc");
assert.equal(bc.length, 1);
assert.equal(bc[0].properties.kind, "estimate");
// 고른 구간이 없으면 흐린 대안도 없다
assert.equal(f.alternatives.features.length, 0);

// 구간을 고르면 그 구간의 다른 방법 2개가 흐리게
const g = buildRouteFeatures(points, legs, [transit, option("ab", "walk", A, B), option("ab", "taxi", A, B)], "ab");
assert.deepEqual(g.alternatives.features.map((x) => x.properties.method).sort(), ["taxi", "walk"]);

// 옮겨진 핀의 낡은 경로는 쓰지 않는다 (추정 직선)
const moved = buildRouteFeatures([pt("a", 37.57, 126.9779), B, C], legs, [transit], null);
assert.equal(moved.lines.features.filter((x) => x.properties.legId === "ab")[0].properties.kind, "estimate");

// 경로가 핀에서 약 60m 떨어진 길에서 시작하면(핀이 건물 안) 핀까지 잇는 선 하나
const offset = option("bc", "walk", B, C, {
  shape: [
    [B.lng, B.lat + 0.00054],
    [C.lng, C.lat],
  ],
});
const h = buildRouteFeatures(points, legs, [offset], null);
assert.equal(h.connectors.features.length, 1);

// 지도를 누른 곳에서 맨 위가 흐린 대안일 때만 이동수단을 바꾼다 (진한 선 아래 깔린 대안은 무시)
assert.deepEqual(altFromHits([{ layer: { id: "route-alt" }, properties: { legId: "ab", method: "taxi" } }]), { legId: "ab", method: "taxi" });
assert.equal(altFromHits([{ layer: { id: "route-line" }, properties: { legId: "ab" } }, { layer: { id: "route-alt" }, properties: { legId: "ab", method: "taxi" } }]), null);
assert.equal(altFromHits([]), null);

// 출처 표기는 처음부터 ODsay 를 포함한다 (나중에 바꾸면 지도 출처가 갱신되지 않는다)
assert.ok(ROUTE_ATTRIBUTION.includes("www.ODsay.com"));
assert.ok(ROUTE_ATTRIBUTION.includes("OpenStreetMap"));

console.log("routeFeatures ok");
