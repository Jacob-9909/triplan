// 경로 모양 자체 점검: node src/features/route/geometry.check.ts
import assert from "node:assert/strict";
import { connectors, decodePolyline } from "./geometry.ts";

const round = (pts: [number, number][]) => pts.map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6]);

// 구글 문서의 예시 (정밀도 5)
assert.deepEqual(round(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@", 5)), [
  [-120.2, 38.5],
  [-120.95, 40.7],
  [-126.453, 43.252],
]);
// 같은 문자열을 정밀도 6(Valhalla)으로 읽으면 값이 10분의 1
assert.deepEqual(round(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@", 6))[0], [-12.02, 3.85]);
assert.deepEqual(decodePolyline("", 6), []);

// 경로가 핀에서 바로 시작·끝나면 잇는 선이 없다
const shape: [number, number][] = [
  [127, 37.5],
  [127.01, 37.5],
];
assert.equal(connectors(shape, { lat: 37.5, lng: 127 }, { lat: 37.5, lng: 127.01 }).length, 0);
// 출발 핀이 경로 시작에서 약 110m 떨어지면 하나
const one = connectors(shape, { lat: 37.501, lng: 127 }, { lat: 37.5, lng: 127.01 });
assert.equal(one.length, 1);
assert.deepEqual(one[0], [[127, 37.501], [127, 37.5]]);
// 모양이 비면 잇지 않는다
assert.equal(connectors([], { lat: 37.501, lng: 127 }, { lat: 37.5, lng: 127.01 }).length, 0);

console.log("geometry ok");
