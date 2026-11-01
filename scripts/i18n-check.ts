// 영어 사전 점검: node scripts/i18n-check.ts [경로...]
// 한국어 문장이 곧 사전 키라서, 코드에 남은 한국어 문자열은 모두 사전에 있어야 한다.
//   MISSING  따옴표 안 한국어인데 영어 사전에 없음 (t("…") 든, 나중에 t(label) 로 옮길 데이터 든)
//   TEMPLATE `…${x}…` 안 한국어: 사전 키가 될 수 없으니 t("… {x} …", { x }) 로 바꾼다
//   ATTR     JSX 속성에 바로 쓴 한국어: aria-label={t("…")}
//   JSX      따옴표 없이 JSX 에 쓴 한국어: {t("…")} 로 감싼다
// 주석, console.*, // i18n-ignore 가 붙은 줄은 건너뛴다.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import EN from "../src/i18n/en/index.ts";

const HANGUL = /[가-힣]/;
const roots = process.argv.slice(2).length ? process.argv.slice(2) : ["src"];

function walk(p: string): string[] {
  if (statSync(p).isFile()) return /\.tsx?$/.test(p) ? [p] : [];
  return readdirSync(p).flatMap((f) => walk(join(p, f)));
}

const problems: string[] = [];
for (const file of roots.flatMap(walk)) {
  if (file.includes("i18n/en/") || file.endsWith(".check.ts")) continue;
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (!HANGUL.test(line) || /i18n-ignore/.test(line) || /console\.\w+\(/.test(line)) return;
      const trimmed = line.trim();
      if (/^(\*|\/\*|\/\/)/.test(trimmed)) return;
      const code = line.replace(/\{\/\*.*?\*\/\}/g, "").replace(/(^|\s)\/\/.*$/, "");
      const at = `${file}:${i + 1}`;
      const strings = /(["'`])((?:\\.|(?!\1).)*?)\1/g;
      for (const m of code.matchAll(strings)) {
        const s = m[2].replace(/\\(["'`\\])/g, "$1");
        if (!HANGUL.test(s)) continue;
        if (m[1] === "`" && s.includes("${")) {
          // 안에서 t("…") 로 부른 건 괜찮다
          if (HANGUL.test(s.replace(/\bt\(\s*"[^"]*"/g, ""))) problems.push(`TEMPLATE ${at}  ${s}`);
        }
        // aria-label="한국어" 처럼 JSX 속성에 바로 쓴 문자열은 번역되지 않는다: aria-label={t("…")}
        else if (code[m.index! - 1] === "=" && /<|^\s*[\w-]+=/.test(code)) problems.push(`ATTR     ${at}  ${s}`);
        else if (!(s in EN)) problems.push(`MISSING  ${at}  ${JSON.stringify(s)}`);
      }
      if (HANGUL.test(code.replace(strings, ""))) problems.push(`JSX      ${at}  ${trimmed.slice(0, 120)}`);
    });
}

for (const p of problems) console.log(p);
console.log(`\n${problems.length} problems`);
process.exitCode = problems.length ? 1 : 0;
