// 링크 미리보기·회고 카드 계산 자체 점검: node src/lib/og/logic.check.ts
import assert from "node:assert/strict";
import { clip, fitSize, glyphSet, joinDots, parseFontCss, seoulToday, siteOrigin, topRated } from "./logic.ts";
import { INKS, stampLook } from "../../features/archive/stamp.ts";

// 글자 묶음은 한 번씩, 정렬, 공백 포함, 줄바꿈 제외
assert.equal(glyphSet("도쿄 도쿄", null, "A\nB"), " AB도쿄");
assert.equal(glyphSet("쿄도"), glyphSet("도쿄"));

// Google Fonts CSS: 굵기별 ttf 주소를 뽑고 woff2 는 버린다
const css = `
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 500;
  src: url(https://fonts.gstatic.com/l/font?kit=abc&v=v40) format('truetype');
}
@font-face {
  font-family: 'Noto Sans KR';
  font-weight: 800;
  src: url(https://fonts.gstatic.com/s/x.woff2) format('woff2');
}
@font-face {
  font-family: 'Noto Sans KR';
  font-weight: 800;
  src: url('https://fonts.gstatic.com/s/x.otf') format("opentype");
}`;
assert.deepEqual(parseFontCss(css), [
  { weight: 500, url: "https://fonts.gstatic.com/l/font?kit=abc&v=v40" },
  { weight: 800, url: "https://fonts.gstatic.com/s/x.otf" },
]);
assert.deepEqual(parseFontCss("<html>error</html>"), []);

// og:image 기준 주소: SITE_URL > x-forwarded-* > host
assert.equal(siteOrigin({ siteUrl: "https://triplan.example.com/some/path", host: "localhost:3000" }), "https://triplan.example.com");
assert.equal(siteOrigin({ siteUrl: "not a url", host: "localhost:3000" }), "http://localhost:3000");
assert.equal(siteOrigin({ proto: "https", forwardedHost: "Triplan.Example.com, proxy.local", host: "127.0.0.1:8030" }), "https://triplan.example.com");
assert.equal(siteOrigin({ proto: "https,http", host: "a.b" }), "https://a.b");
assert.equal(siteOrigin({ host: "localhost:3124" }), "http://localhost:3124");
assert.equal(siteOrigin({ host: "evil.com/path" }), null);
assert.equal(siteOrigin({}), null);

// 점 잇기: 빈 값 건너뛰고 같은 값은 한 번
assert.equal(joinDots(["일본", "도쿄", null, "", false, "3박 4일"]), "일본 · 도쿄 · 3박 4일");
assert.equal(joinDots(["싱가포르", "싱가포르"]), "싱가포르");
assert.equal(joinDots([]), "");

// 자르기: 글자(코드포인트) 단위, 공백 정리
assert.equal(clip("  아침   바다가 최고 ", 20), "아침 바다가 최고");
assert.equal(clip("가나다라마바사", 5), "가나다라…");

// 글자 크기: 짧으면 max, 길면 줄어들되 min 아래로는 안 간다
assert.equal(fitSize("도쿄", { width: 1000, lines: 1, max: 80, min: 40 }), 80);
assert.equal(fitSize("가".repeat(60), { width: 1000, lines: 1, max: 80, min: 40 }), 40);
const mid = fitSize("가".repeat(15), { width: 1000, lines: 1, max: 80, min: 40 });
assert.ok(mid < 80 && mid > 40);

// 평점 순, 같으면 한줄평 있는 곳, 그다음 Day·순서
const pt = (rating: number | null, review: string | null, day: number, order: number) => ({
  name: `${rating}-${day}-${order}`,
  rating,
  review,
  day_number: day,
  visit_order: order,
});
const top = topRated([pt(4, null, 1, 1), pt(null, "x", 1, 2), pt(5, "a", 2, 1), pt(4, "b", 2, 2), pt(4, "c", 1, 3), pt(3, "d", 1, 4)]);
assert.deepEqual(
  top.map((p) => p.name),
  ["5-2-1", "4-1-3", "4-2-2"]
);
assert.deepEqual(topRated([pt(null, null, 1, 1)]), []);

// 한국 날짜: UTC 2026-11-05 20:00 은 한국 11월 6일
const today = seoulToday(new Date("2026-11-05T20:00:00Z"));
assert.deepEqual([today.getFullYear(), today.getMonth() + 1, today.getDate()], [2026, 11, 6]);

// 도장: 같은 id 면 같은 모양, 잉크는 목록 안. >> 가 부호 있는 shift 라 기울기는 -27~9도 (화면 도장과 같게 둔다)
const look = stampLook("2c397b50-78b8-4bfb-bc2f-d145aa472797");
assert.deepEqual(look, stampLook("2c397b50-78b8-4bfb-bc2f-d145aa472797"));
for (const id of ["2c397b50-78b8-4bfb-bc2f-d145aa472797", "58a657b2-7c50-45ca-a95b-dfd45b169142", "a", ""]) {
  const l = stampLook(id);
  assert.ok(INKS.includes(l.ink));
  assert.ok(l.tilt >= -27 && l.tilt <= 9);
}

console.log("og logic ok");
