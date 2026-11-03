// ODsay 하루 한도 자체 점검: node src/lib/routing/odsay.check.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ODSAY_DAILY_LIMIT, odsayTransit } from "./odsay.ts";

const ok = readFileSync(new URL("./fixtures/odsay.json", import.meta.url), "utf8");
let body = ok;
let calls = 0;
globalThis.fetch = (async () => {
  calls++;
  return new Response(body, { status: 200 });
}) as typeof fetch;
process.env.ODSAY_API_KEY = "test";
const a = { lat: 37.5663, lng: 126.9779 };
const b = { lat: 37.5572, lng: 126.9245 };

// 하루 30건까지는 묻고, 31번째는 묻지 않고 "quota"
for (let i = 0; i < ODSAY_DAILY_LIMIT; i++) assert.notEqual(await odsayTransit(a, b), "quota");
assert.equal(calls, ODSAY_DAILY_LIMIT);
assert.equal(await odsayTransit(a, b), "quota");
assert.equal(calls, ODSAY_DAILY_LIMIT);

// 한국 시각으로 날짜가 바뀌면 다시 0부터
const realNow = Date.now;
Date.now = () => realNow() + 86_400_000;
assert.notEqual(await odsayTransit(a, b), "quota");

// ODsay 가 한도 초과 오류를 주면 그날은 더 묻지 않는다
body = JSON.stringify({ error: [{ code: "-8", message: "일일 호출 한도를 초과했습니다." }] });
assert.equal(await odsayTransit(a, b), "quota");
const before = calls;
body = ok;
assert.equal(await odsayTransit(a, b), "quota");
assert.equal(calls, before);
Date.now = realNow;

console.log("odsay quota ok");
