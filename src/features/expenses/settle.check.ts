// 정산 자체 점검: node src/features/expenses/settle.check.ts
import assert from "node:assert/strict";
import { settle } from "./settle.ts";

const people = ["민수", "지영", "철수"];

// 민수가 30,000 (셋이 나눔), 지영이 12,000 (지영·철수만)
const r = settle(
  [
    { amount_krw: 30000, paid_by: "민수", split_with: null },
    { amount_krw: 12000, paid_by: "지영", split_with: ["지영", "철수"] },
    { amount_krw: 5000, paid_by: null, split_with: null },
  ],
  people
);
assert.equal(r.skipped, 1);
assert.deepEqual(Object.fromEntries(r.balance), { 민수: 20000, 지영: -4000, 철수: -16000 });
assert.deepEqual(r.transfers, [
  { from: "철수", to: "민수", krw: 16000 },
  { from: "지영", to: "민수", krw: 4000 },
]);

// 나누어떨어지지 않아도 1원짜리 송금이 생기지 않는다
const odd = settle([{ amount_krw: 10000, paid_by: "민수", split_with: null }], people);
assert.equal(odd.transfers.length, 2);
assert.ok(odd.transfers.every((t) => t.to === "민수" && t.krw === 3333));

// 혼자 낸 걸 혼자 나누면 송금 없음
assert.deepEqual(settle([{ amount_krw: 9000, paid_by: "지영", split_with: ["지영"] }], people).transfers, []);

console.log("settle ok");
