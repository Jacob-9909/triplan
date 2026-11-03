// NIM 응답 해석 자체 점검: node src/lib/nim.check.ts
import assert from "node:assert/strict";
import { parseNimNames } from "./nim.ts";

const reply = (content: string) => ({ choices: [{ message: { content } }] });

assert.deepEqual(parseNimNames(reply('{"names":["아사쿠사·우에노"," 시부야 "]}'), 2), ["아사쿠사·우에노", "시부야"]);
// 개수가 다르면 믿지 않는다
assert.equal(parseNimNames(reply('{"names":["아사쿠사"]}'), 2), null);
// JSON 이 아니면 null
assert.equal(parseNimNames(reply("아사쿠사, 시부야"), 2), null);
assert.equal(parseNimNames({ error: "rate limited" }, 1), null);
// 너무 긴 이름은 30자로 자른다. 빈 이름은 null
const long = "가".repeat(40);
assert.deepEqual(parseNimNames(reply(JSON.stringify({ names: [long, ""] })), 2), ["가".repeat(30), null]);

console.log("nim ok");
