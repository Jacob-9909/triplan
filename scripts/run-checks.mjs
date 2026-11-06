// 자체 점검 모두 돌리기: npm test
// src 아래 *.check.ts 를 하나씩 node 로 실행한다 (Node 22 가 타입을 지우고 바로 실행).
// 하나라도 실패하면 종료 코드 1 — CI(.github/workflows/ci-cd.yml)가 배포 전에 막는다
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".check.ts") ? [p] : [];
  });
}

const files = walk("src").sort();
let failed = 0;
for (const file of files) {
  const started = Date.now();
  const r = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", file], { encoding: "utf8" });
  const ms = Date.now() - started;
  const name = relative(".", file).replaceAll("\\", "/");
  if (r.status === 0) {
    console.log(`ok   ${name} (${ms}ms)`);
  } else {
    failed++;
    console.log(`FAIL ${name}`);
    process.stdout.write((r.stdout ?? "") + (r.stderr ?? ""));
  }
}
console.log(`\n${files.length - failed}/${files.length} passed`);
process.exit(failed ? 1 : 0);
