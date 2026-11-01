// 동선 정렬 자체 점검: node src/features/route/optimize.check.ts
import assert from "node:assert/strict";
import { optimizeOrder } from "./optimize.ts";

// 한 줄로 늘어선 다섯 곳을 뒤죽박죽 넣어도, 출발지에서 순서대로 지나간다
const p = (id: string, lng: number) => ({ id, lat: 37.5, lng });
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).join("");
assert.equal(ids(optimizeOrder([p("A", 127.0), p("D", 127.03), p("B", 127.01), p("E", 127.04), p("C", 127.02)])), "ABCDE");

// 첫 장소는 가운데 있어도 그대로 첫 장소
assert.equal(optimizeOrder([p("M", 127.02), p("A", 127.0), p("Z", 127.04)])[0].id, "M");

// 두 곳 이하면 손대지 않는다
assert.equal(ids(optimizeOrder([p("B", 1), p("A", 0)])), "BA");

console.log("optimize ok");
