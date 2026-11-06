/**
 * OSM opening_hours 의 흔한 부분만 읽는다. 서버(API)와 화면이 같이 쓰므로 @/ 별칭을 쓰지 않는다.
 * 읽지 못하는 형식(월·날짜·주차·sunrise·"+"·주석 등)은 null 을 돌려주고, 짐작으로 경고하지 않는다.
 */

/** [여는 시각, 닫는 시각] (분, 그날 0시 기준). 자정을 넘기면 닫는 시각이 1440 보다 크다 */
export type Range = [number, number];
/** 요일별 영업 구간. 0 = 일요일 … 6 = 토요일, 빈 배열은 휴무 */
export type Week = Range[][];

export interface VisitCheck {
  status: "ok" | "closed-day" | "outside" | "unknown";
  /** 그날 영업 구간, 예: "09:00–17:00" */
  hours?: string;
}

const DAY_INDEX: Record<string, number> = { su: 0, mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6 };

type Token =
  | { k: "time"; v: Range }
  | { k: "day"; v: number }
  | { k: "ph" }
  | { k: "off" }
  | { k: "," }
  | { k: "-" };

// 시간 구간을 요일 범위의 "-" 보다 먼저 본다. 요일·키워드 뒤에 글자가 이어지면(Mon, Jan, offset) 받지 않는다
const TOKEN = /\s*(?:(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})|(mo|tu|we|th|fr|sa|su)(?![a-z])|(ph)(?![a-z])|(off|closed)(?![a-z])|([,-]))/iy;

function tokenize(rule: string): Token[] | null {
  const out: Token[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < rule.length) {
    if (/^\s*$/.test(rule.slice(TOKEN.lastIndex))) break;
    const m = TOKEN.exec(rule);
    if (!m) return null;
    if (m[1] !== undefined) {
      const start = Number(m[1]) * 60 + Number(m[2]);
      let end = Number(m[3]) * 60 + Number(m[4]);
      if (Number(m[2]) > 59 || Number(m[4]) > 59 || start >= 1440 || end > 48 * 60) return null;
      // 닫는 시각이 여는 시각보다 이르면 다음 날 새벽까지
      if (end <= start) end += 1440;
      out.push({ k: "time", v: [start, end] });
    } else if (m[5]) out.push({ k: "day", v: DAY_INDEX[m[5].toLowerCase()] });
    else if (m[6]) out.push({ k: "ph" });
    else if (m[7]) out.push({ k: "off" });
    else out.push({ k: m[8] as "," | "-" });
  }
  return out;
}

/** ";" 로 나눈 규칙 하나를 week 에 반영. 읽지 못하면 false */
function applyRule(rule: string, week: Week): boolean {
  if (/^24\/7$/.test(rule)) {
    for (let d = 0; d < 7; d++) week[d] = [[0, 1440]];
    return true;
  }
  const toks = tokenize(rule);
  if (!toks || toks.length === 0) return false;
  let p = 0;
  let additive = false;
  while (p < toks.length) {
    // 요일 고르기 (없으면 매일). PH 는 공휴일 날짜를 모르니 빼고 본다
    const days = new Set<number>();
    let hasSelector = false;
    while (toks[p]?.k === "day" || toks[p]?.k === "ph") {
      hasSelector = true;
      const tok = toks[p++];
      if (tok.k === "day") {
        if (toks[p]?.k === "-") {
          const to = toks[p + 1];
          if (to?.k !== "day") return false;
          p += 2;
          // Fr-Mo 처럼 주말을 넘어 돌아가는 범위
          for (let d = tok.v; ; d = (d + 1) % 7) {
            days.add(d);
            if (d === to.v) break;
          }
        } else days.add(tok.v);
      }
      const next = toks[p + 1]?.k;
      if (toks[p]?.k === "," && (next === "day" || next === "ph")) p++;
      else break;
    }

    // 영업 구간 또는 휴무
    let ranges: Range[];
    if (toks[p]?.k === "off") {
      ranges = [];
      p++;
    } else if (toks[p]?.k === "time") {
      ranges = [];
      for (;;) {
        ranges.push((toks[p++] as { v: Range }).v);
        if (toks[p]?.k === "," && toks[p + 1]?.k === "time") p++;
        else break;
      }
    } else {
      // 요일만 있고 시간이 없는 규칙 등은 짐작하지 않는다
      return false;
    }

    // PH 만 고른 규칙은 건너뛴다
    if (!(hasSelector && days.size === 0)) {
      const targets = hasSelector ? [...days] : [0, 1, 2, 3, 4, 5, 6];
      for (const d of targets) week[d] = additive && ranges.length ? [...week[d], ...ranges] : [...ranges];
    }

    if (p >= toks.length) break;
    // "Mo-Fr 09:00-18:00, Sa 10:00-14:00": 쉼표 뒤 요일은 덮어쓰지 않고 더하는 규칙
    if (toks[p].k === "," && toks[p + 1]?.k === "day") {
      p++;
      additive = true;
      continue;
    }
    return false;
  }
  return true;
}

/** opening_hours 문자열 → 요일별 영업 구간. 읽지 못하면 null */
export function parseOpeningHours(s: string | null | undefined): Week | null {
  const text = s?.trim();
  if (!text || text.length > 200) return null;
  const week: Week = Array.from({ length: 7 }, () => []);
  // 뒤 규칙이 같은 요일의 앞 규칙을 덮어쓴다
  for (const part of text.split(";")) {
    const rule = part.trim();
    if (rule && !applyRule(rule, week)) return null;
  }
  return week;
}

function hhmm(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** 구간 → "09:00–17:00". 자정을 넘기면 "18:00–02:00", 자정 마감은 "24:00" */
export function formatRange([s, e]: Range) {
  return `${hhmm(s)}–${hhmm(e > 1440 ? e - 1440 : e)}`;
}

/**
 * 그 요일(0 = 일요일)에 arriveMin~leaveMin 동안 머물 수 있는지.
 * 닫는 시각에 맞춰 떠나는 건 괜찮다. 전날 밤 영업이 자정을 넘겨 이어지는 것도 본다.
 */
export function checkVisit(s: string | null | undefined, weekday: number, arriveMin: number, leaveMin: number): VisitCheck {
  const week = parseOpeningHours(s);
  if (!week) return { status: "unknown" };
  // 자정을 넘겨 도착하면 다음 날 영업시간으로 본다
  const shift = Math.floor(arriveMin / 1440);
  const day = (((weekday + shift) % 7) + 7) % 7;
  const arrive = arriveMin - shift * 1440;
  const leave = leaveMin - shift * 1440;

  // 전날·그날·다음 날 구간을 한 줄로 이어 붙여, 맞닿은 구간은 하나로 합친다
  const spans: Range[] = [];
  for (const off of [-1, 0, 1]) {
    for (const [a, b] of week[(day + off + 7) % 7]) spans.push([a + off * 1440, b + off * 1440]);
  }
  spans.sort((x, y) => x[0] - y[0]);
  const merged: Range[] = [];
  for (const [a, b] of spans) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }

  const own = week[day];
  const hours = own.length ? own.map(formatRange).join(", ") : undefined;
  if (merged.some(([a, b]) => arrive >= a && leave <= b)) return { status: "ok", hours };
  if (!own.length) return { status: "closed-day" };
  return { status: "outside", hours };
}

/** "yyyy-MM-dd" → 요일 (0 = 일요일). 시간대와 상관없이 그 날짜의 요일 */
export function weekdayOf(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay() : null;
}

/** Overpass 결과 하나 (이름이 있고 opening_hours 가 있는 것만) */
export interface OsmPlace {
  tags: Record<string, string>;
  lat: number;
  lng: number;
}

/** 대소문자·공백·문장부호를 무시하고 비교한다 */
export function normalizeName(s: string) {
  return s.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/**
 * 근처 OSM 장소 중 우리 장소와 같은 곳을 고른다.
 * 이름(name·name:ko·name:en·name:ja)이 같거나 한쪽이 다른 쪽을 품으면 맞는 것으로 보고, 같으면 가까운 쪽.
 * 이름이 맞는 게 없으면 25 m 안에 딱 하나 있을 때만 그것. 없으면 null
 */
export function pickOsmPlace(places: OsmPlace[], name: string, at: { lat: number; lng: number }): OsmPlace | null {
  const want = normalizeName(name);
  let best: { place: OsmPlace; score: number; dist: number } | null = null;
  for (const place of places) {
    if (!place.tags.opening_hours) continue;
    const dist = distanceM(at, place);
    let score = 0;
    for (const key of ["name", "name:ko", "name:en", "name:ja"]) {
      const got = place.tags[key] ? normalizeName(place.tags[key]) : "";
      if (!got || !want) continue;
      if (got === want) score = Math.max(score, 2);
      else if (Math.min(got.length, want.length) >= 2 && (got.includes(want) || want.includes(got))) score = Math.max(score, 1);
    }
    if (score > 0 && (!best || score > best.score || (score === best.score && dist < best.dist))) best = { place, score, dist };
  }
  if (best) return best.place;
  const near = places.filter((p) => p.tags.opening_hours && distanceM(at, p) <= 25);
  return near.length === 1 ? near[0] : null;
}
