import type { MapPoint } from "@/lib/types";

// 링크 미리보기·회고 카드 이미지의 순수 계산. 점검: node src/lib/og/logic.check.ts

/** 폰트 서브셋 요청용 글자 묶음: 한 번씩만, 정렬해서 (같은 글자들이면 캐시를 같이 쓴다) */
export function glyphSet(...texts: (string | null | undefined)[]): string {
  const chars = new Set<string>([" "]);
  for (const text of texts) for (const ch of text ?? "") if (!/[\n\r\t]/.test(ch)) chars.add(ch);
  return [...chars].sort().join("");
}

export interface FontFile {
  weight: number;
  url: string;
}

/** Google Fonts CSS 에서 굵기별 폰트 파일 주소를 뽑는다. satori 는 ttf·otf·woff 만 읽는다 (woff2 는 못 읽음) */
export function parseFontCss(css: string): FontFile[] {
  const out: FontFile[] = [];
  for (const block of css.split("@font-face").slice(1)) {
    const weight = Number(/font-weight:\s*(\d+)/.exec(block)?.[1]);
    const src = /src:\s*url\(([^)]+)\)\s*format\(['"](truetype|opentype|woff)['"]\)/.exec(block);
    if (weight && src) out.push({ weight, url: src[1].replace(/^['"]|['"]$/g, "") });
  }
  return out;
}

const firstValue = (v?: string | null) => v?.split(",")[0]?.trim() || null;

/**
 * og:image 절대 주소의 기준(origin). SITE_URL 이 있으면 그것,
 * 없으면 프록시가 넘긴 x-forwarded-proto/host, 그것도 없으면 host 헤더. 이상한 값이면 null
 */
export function siteOrigin(h: {
  siteUrl?: string | null;
  proto?: string | null;
  forwardedHost?: string | null;
  host?: string | null;
}): string | null {
  if (h.siteUrl) {
    try {
      const url = new URL(h.siteUrl);
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
    } catch {
      // 잘못 넣은 값이면 요청 헤더로 넘어간다
    }
  }
  const host = firstValue(h.forwardedHost) ?? firstValue(h.host);
  if (!host || !/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return null;
  const proto = firstValue(h.proto);
  return `${proto === "https" ? "https" : "http"}://${host.toLowerCase()}`;
}

/** " · " 로 잇는다. 빈 값은 건너뛰고 같은 값은 한 번만 (나라와 지역 이름이 같을 때) */
export function joinDots(parts: (string | null | undefined | false)[]): string {
  return [...new Set(parts.filter((p): p is string => !!p && !!p.trim()))].join(" · ");
}

/** 긴 글은 max 글자에서 자르고 … 를 붙인다 (이미지에는 말줄임 CSS 가 없다) */
export function clip(text: string, max: number): string {
  const chars = [...text.trim().replace(/\s+/g, " ")];
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : chars.join("");
}

/** 글자 폭 어림(em): 한글·한자는 1, 라틴 대문자·숫자 0.62, 소문자 0.55, 공백 0.28 */
export function textEms(text: string): number {
  let ems = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x1100) ems += 1;
    else if (ch === " ") ems += 0.28;
    else if (/[a-z]/.test(ch)) ems += 0.55;
    else ems += 0.62;
  }
  return ems;
}

/** 폭 width(px)에 lines 줄 안으로 들어가는 글자 크기 (min~max) */
export function fitSize(text: string, opts: { width: number; lines: number; max: number; min: number }): number {
  const ems = textEms(text);
  if (!ems) return opts.max;
  // 줄바꿈이 단어 단위라 한 줄을 다 못 채운다: 90%만 쓴다고 본다
  const size = Math.floor((opts.width * opts.lines * 0.9) / ems);
  return Math.max(opts.min, Math.min(opts.max, size));
}

type Rated = Pick<MapPoint, "rating" | "review" | "day_number" | "visit_order">;

/** 회고 카드에 올릴 평점 높은 곳: 별점 순, 같으면 한줄평이 있는 곳, 그다음 방문 순서 */
export function topRated<T extends Rated>(points: T[], n = 3): T[] {
  const hasReview = (p: T) => (p.review?.trim() ? 1 : 0);
  return points
    .filter((p) => (p.rating ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) ||
        hasReview(b) - hasReview(a) ||
        (a.day_number ?? 99) - (b.day_number ?? 99) ||
        (a.visit_order ?? 99) - (b.visit_order ?? 99)
    )
    .slice(0, n);
}

/** 서버 시간대(UTC 등)와 상관없이 한국 날짜로 '오늘'. date-fns 는 로컬 달력으로 날짜 차이를 센다 */
export function seoulToday(now = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
