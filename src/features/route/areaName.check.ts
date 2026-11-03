// Day 구역 이름 합치기 자체 점검: node src/features/route/areaName.check.ts
import assert from "node:assert/strict";
import { mergeArea } from "./areaName.ts";

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

console.log("areaName ok");
