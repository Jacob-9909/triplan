// Day 구역 이름 합치기 자체 점검: node src/features/route/areaName.check.ts
import assert from "node:assert/strict";
import { groupKey, mergeArea, missingKeys, namesFor } from "./areaName.ts";

// 새 이름이 없으면(대체 이름) 그대로
assert.equal(mergeArea("아사쿠사", null), "아사쿠사");
assert.equal(mergeArea(null, null), null);
// 비어 있으면 새 이름
assert.equal(mergeArea(null, "시부야"), "시부야");
assert.equal(mergeArea("", "시부야"), "시부야");
// 이미 들어 있으면 그대로
assert.equal(mergeArea("아사쿠사 · 시부야", "시부야"), "아사쿠사 · 시부야");
// 아니면 " · " 로 잇는다
assert.equal(mergeArea("아사쿠사", "시부야"), "아사쿠사 · 시부야");

// 구역 이름은 구역(장소 묶음)마다 기억한다: 다른 구역이 바뀌어도 그대로, 짓는 중이면 undefined
const k1 = groupKey(["b", "a"]);
const k2 = groupKey(["c", "d"]);
assert.equal(k1, groupKey(["a", "b"]));
const cache = { [k1]: "아사쿠사", [k2]: null };
assert.deepEqual(namesFor([k1, k2, "x,y"], cache), ["아사쿠사", null, undefined]);
// 이미 있거나 묻는 중인 구역은 다시 묻지 않는다
assert.deepEqual(missingKeys([k1, "x,y", "p,q"], cache, new Set(["p,q"])), ["x,y"]);

console.log("areaName ok");
