/**
 * 여행 일정을 iCalendar(RFC 5545) 문서로 만든다.
 * node 자체 점검(ics.check.ts)에서도 돌도록 @/ 별칭이나 Next 전용 모듈을 쓰지 않는다.
 */

/** 종일: "YYYY-MM-DD"(end 는 다음 날, 미포함) · 현지 시각: "YYYY-MM-DDTHH:MM" · UTC: Date */
export type IcsWhen =
  | { kind: "date"; start: string; end: string }
  | { kind: "floating"; start: string; end: string }
  | { kind: "utc"; start: Date; end: Date };

export interface IcsEvent {
  uid: string;
  summary: string;
  when: IcsWhen;
  description?: string | null;
  location?: string | null;
  geo?: { lat: number; lng: number } | null;
  /** 종일 일정은 바쁨으로 막지 않는다 */
  transparent?: boolean;
}

export interface IcsCalendar {
  name: string;
  events: IcsEvent[];
  /** DTSTAMP. 점검에서 고정하려고 받는다 */
  now?: Date;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;
const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/** TEXT 값 이스케이프: 역슬래시를 먼저 바꿔야 뒤에 넣은 역슬래시가 두 번 바뀌지 않는다 */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

function utf8Len(cp: number) {
  return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
}

/**
 * 75옥텟마다 접는다. 이어지는 줄은 공백 하나로 시작하고 그 공백도 75옥텟에 든다.
 * 한글처럼 여러 바이트인 글자는 중간에서 자르지 않는다.
 */
export function foldLine(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = utf8Len(ch.codePointAt(0)!);
    if (bytes + n > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
      limit = 74;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** "YYYY-MM-DD" 에 분을 더한 UTC 기준 Date (시간대 없는 계산용) */
function dateAt(date: string, minutes = 0): Date | null {
  const m = DATE_RE.exec(date);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + minutes * 60_000);
}

/** "YYYY-MM-DD" + 일수 → "YYYY-MM-DD" */
export function addDays(date: string, days: number): string | null {
  const d = dateAt(date, days * 1440);
  return d ? d.toISOString().slice(0, 10) : null;
}

/** "YYYY-MM-DD" + 분 → 현지 시각 "YYYY-MM-DDTHH:MM" (24시를 넘으면 다음 날) */
export function localAt(date: string, minutes: number): string | null {
  const d = dateAt(date, minutes);
  return d ? d.toISOString().slice(0, 16) : null;
}

function icsDate(date: string) {
  const m = DATE_RE.exec(date);
  return m ? `${m[1]}${m[2]}${m[3]}` : null;
}

function icsLocal(value: string) {
  const m = LOCAL_RE.exec(value);
  return m ? `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}00` : null;
}

export function icsUtc(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes()
  )}${pad(d.getUTCSeconds())}Z`;
}

/** 형식이 틀린 날짜면 null: 그 일정은 통째로 뺀다 */
function whenLines(when: IcsWhen): string[] | null {
  if (when.kind === "date") {
    const s = icsDate(when.start);
    const e = icsDate(when.end);
    return s && e ? [`DTSTART;VALUE=DATE:${s}`, `DTEND;VALUE=DATE:${e}`] : null;
  }
  if (when.kind === "floating") {
    // 시간대를 붙이지 않는다: 여행지에 있을 때 그곳 시각 그대로 보이게
    const s = icsLocal(when.start);
    const e = icsLocal(when.end);
    return s && e ? [`DTSTART:${s}`, `DTEND:${e}`] : null;
  }
  if (Number.isNaN(when.start.getTime()) || Number.isNaN(when.end.getTime())) return null;
  return [`DTSTART:${icsUtc(when.start)}`, `DTEND:${icsUtc(when.end)}`];
}

function coord(n: number) {
  return String(Math.round(n * 1e6) / 1e6);
}

/** VCALENDAR 문서. 줄 끝은 CRLF, 마지막 줄도 CRLF 로 끝난다 */
export function buildIcs({ name, events, now = new Date() }: IcsCalendar): string {
  const stamp = icsUtc(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Triplan//Trip Calendar//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    // 구독한 캘린더 앱이 6시간마다 다시 받아 바뀐 일정을 반영한다
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const ev of events) {
    const when = whenLines(ev.when);
    if (!when) continue;
    lines.push("BEGIN:VEVENT", `UID:${ev.uid}`, `DTSTAMP:${stamp}`, ...when, `SUMMARY:${escapeText(ev.summary)}`);
    if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
    if (ev.geo && Number.isFinite(ev.geo.lat) && Number.isFinite(ev.geo.lng)) {
      lines.push(`GEO:${coord(ev.geo.lat)};${coord(ev.geo.lng)}`);
    }
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.transparent) lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

// ---- 여행 → 일정 ----

export interface CalTrip {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  region?: string | null;
  country?: string | null;
}

export interface CalPoint {
  id: string;
  name: string;
  memo: string | null;
  lat: number;
  lng: number;
  day_number: number | null;
  visit_order: number | null;
  link_url?: string | null;
}

export interface CalDoc {
  id: string;
  type: string;
  title: string;
  provider: string | null;
  confirmation_code: string | null;
  url: string | null;
  starts_at: string | null;
  ends_at: string | null;
}

export interface TripCalendarInput<P extends CalPoint> {
  trip: CalTrip;
  points: P[];
  docs: CalDoc[];
  /** 하루 장소(방문 순서대로) → 도착·출발(분). 서버에선 buildSchedule 을 넘긴다 */
  schedule: (dayPoints: P[]) => Map<string, { arrive: number; leave: number }>;
  /** 보기 링크면 false: 예약번호와 예약 링크를 뺀다 (보기 링크 API 와 같은 규칙) */
  showPrivate: boolean;
  /** 라벨 번역. 안 넘기면 한국어 */
  t?: (key: string, vars?: Record<string, string | number>) => string;
}

/** 여권·비자·보험은 여행 내내 걸친 서류라 일정으로 넣지 않는다 (dayDocs 와 같은 규칙) */
const WHOLE_TRIP_DOCS = ["passport", "visa", "insurance"];

const fill = (key: string, vars?: Record<string, string | number>) =>
  vars ? key.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : key;

/** 여행 전체(종일) + Day 에 넣은 장소(현지 시각) + 예약 */
export function tripEvents<P extends CalPoint>({ trip, points, docs, schedule, showPrivate, t = fill }: TripCalendarInput<P>): IcsEvent[] {
  const events: IcsEvent[] = [];
  const start = trip.start_date && DATE_RE.test(trip.start_date) ? trip.start_date.slice(0, 10) : null;

  if (start) {
    const last = trip.end_date && DATE_RE.test(trip.end_date) && trip.end_date >= start ? trip.end_date.slice(0, 10) : start;
    events.push({
      uid: `trip-${trip.id}@triplan`,
      summary: trip.title,
      when: { kind: "date", start, end: addDays(last, 1)! },
      location: [trip.region, trip.country].filter(Boolean).join(", ") || null,
      transparent: true,
    });

    // 후보함(day_number 없음)은 날짜가 없으니 뺀다
    const days = new Map<number, P[]>();
    for (const p of points) {
      if (p.day_number == null || p.day_number < 1) continue;
      days.set(p.day_number, [...(days.get(p.day_number) ?? []), p]);
    }
    for (const [day, list] of [...days].sort((a, b) => a[0] - b[0])) {
      // 일정 화면과 같은 순서 (순서 없는 장소는 뒤로)
      const ordered = [...list].sort((a, b) => (a.visit_order ?? 99) - (b.visit_order ?? 99));
      const times = schedule(ordered);
      const date = addDays(start, day - 1)!;
      for (const p of ordered) {
        const time = times.get(p.id);
        if (!time) continue;
        events.push({
          uid: `point-${p.id}@triplan`,
          summary: p.name,
          when: { kind: "floating", start: localAt(date, time.arrive)!, end: localAt(date, Math.max(time.leave, time.arrive))! },
          location: p.name,
          geo: { lat: p.lat, lng: p.lng },
          description: [p.memo?.trim(), p.link_url?.trim(), `Day ${day}`].filter(Boolean).join("\n"),
        });
      }
    }
  }

  for (const d of docs) {
    if (!d.starts_at || WHOLE_TRIP_DOCS.includes(d.type)) continue;
    const description = [
      d.provider?.trim(),
      showPrivate && d.confirmation_code ? t("예약번호 {code}", { code: d.confirmation_code }) : null,
      showPrivate ? d.url?.trim() : null,
    ]
      .filter(Boolean)
      .join("\n");
    const base = { uid: `doc-${d.id}@triplan`, summary: d.title, description: description || null };
    if (d.starts_at.includes("T")) {
      // 시각이 있는 예약은 UTC 로 (끝이 없으면 1시간)
      const s = new Date(d.starts_at);
      const e = d.ends_at?.includes("T") ? new Date(d.ends_at) : new Date(s.getTime() + 3_600_000);
      events.push({ ...base, when: { kind: "utc", start: s, end: e > s ? e : new Date(s.getTime() + 3_600_000) } });
    } else {
      // 날짜만 있는 예약(지금 travel_docs 는 date 컬럼)은 종일 일정, 끝나는 날까지 포함
      const s = d.starts_at.slice(0, 10);
      const last = d.ends_at && d.ends_at.slice(0, 10) >= s ? d.ends_at.slice(0, 10) : s;
      const end = addDays(last, 1);
      if (end) events.push({ ...base, when: { kind: "date", start: s, end }, transparent: true });
    }
  }
  return events;
}
