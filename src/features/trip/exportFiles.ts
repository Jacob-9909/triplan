import type { MapPoint, TravelDoc } from "@/lib/types";

/** 내보내기에 쓰는 하루 일정: 날짜("yyyy-MM-dd", 날짜 없는 여행이면 null)와 시각(분, 0시 기준)이 붙은 장소 */
export interface ExportDay {
  day: number;
  date: string | null;
  area?: string | null;
  stops: { point: MapPoint; arrive: number; leave: number }[];
}

type T = (key: string, vars?: Record<string, string | number>) => string;

/** "yyyy-MM-dd" + 일수 → "yyyy-MM-dd" (UTC 로 계산해 시간대와 무관) */
function addDaysIso(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 날짜 + 분 → 떠 있는(floating) 현지 시각 20261120T090000. 24시를 넘으면 다음 날로 */
function icsLocal(date: string, min: number): string {
  const day = addDaysIso(date, Math.floor(min / 1440));
  const m = ((min % 1440) + 1440) % 1440;
  return `${day.replaceAll("-", "")}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`;
}

/** RFC 5545 TEXT 값: 역슬래시·세미콜론·쉼표·줄바꿈을 이스케이프 */
function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** 한 줄 75바이트 제한: 넘으면 글자 경계에서 접고 다음 줄은 공백으로 시작 (한글은 3바이트) */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

/**
 * 캘린더 파일(.ics): 장소마다 도착~출발 일정, 날짜가 있는 예약(항공·숙소·티켓)은 종일 일정.
 * ponytail: 시간대 없이(floating) 적는다. 캘린더가 "현지 그 시각"으로 보여 줘서 여행지에선 폰 시각과 맞는다.
 * 출발 전 한국에서 보면 같은 숫자가 한국 시각으로 보인다. 정확한 시차가 필요하면 TZID + VTIMEZONE 로 바꾼다.
 */
export function buildIcs(
  { title, days, docs, stamp }: { title: string; days: ExportDay[]; docs: TravelDoc[]; stamp: Date },
  t: T,
  skipDoc: (doc: TravelDoc) => boolean
): string {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Triplan//Trip export//KO", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${icsText(title)}`];
  for (const d of days) {
    if (!d.date) continue;
    d.stops.forEach(({ point, arrive, leave }, i) => {
      const desc = [t("{title} · Day {day} · {n}번째", { title, day: d.day, n: i + 1 }), point.memo].filter(Boolean).join("\n");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${point.id}@triplan`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${icsLocal(d.date!, arrive)}`,
        `DTEND:${icsLocal(d.date!, Math.max(leave, arrive + 15))}`,
        `SUMMARY:${icsText(point.name)}`,
        `LOCATION:${icsText(point.name)}`,
        `GEO:${point.lat};${point.lng}`,
        `DESCRIPTION:${icsText(desc)}`,
        ...(point.link_url ? [`URL:${point.link_url}`] : []),
        "END:VEVENT"
      );
    });
  }
  for (const doc of docs) {
    if (!doc.starts_at || skipDoc(doc)) continue;
    const start = doc.starts_at.slice(0, 10);
    const end = (doc.ends_at ?? doc.starts_at).slice(0, 10);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${doc.id}@triplan`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${start.replaceAll("-", "")}`,
      // 종일 일정의 끝은 마지막 날 다음 날 (끝 날짜는 포함하지 않는다)
      `DTEND;VALUE=DATE:${addDaysIso(end, 1).replaceAll("-", "")}`,
      `SUMMARY:${icsText([doc.title, doc.provider].filter(Boolean).join(" · "))}`,
      ...(doc.confirmation_code ? [`DESCRIPTION:${icsText(t("예약번호 {code}", { code: doc.confirmation_code }))}`] : []),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

function xml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/**
 * 지도 파일(.kml): Day 마다 폴더(구글 내 지도에서 레이어 하나), 숙소·후보함은 그 뒤 폴더.
 * 구글 내 지도·Organic Maps·Maps.me 에서 가져오기로 연다.
 */
export function buildKml(
  { title, days, bin, stays = [] }: { title: string; days: ExportDay[]; bin: MapPoint[]; stays?: MapPoint[] },
  t: T
): string {
  const placemark = (name: string, p: MapPoint) =>
    `<Placemark><name>${xml(name)}</name>${p.memo ? `<description>${xml(p.memo)}</description>` : ""}<Point><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`;
  const folders = days
    .filter((d) => d.stops.length > 0)
    .map((d) => {
      const name = [`Day ${d.day}`, d.date, d.area].filter(Boolean).join(" · ");
      return `<Folder><name>${xml(name)}</name>${d.stops.map((s, i) => placemark(`${i + 1}. ${s.point.name}`, s.point)).join("")}</Folder>`;
    });
  if (stays.length) folders.push(`<Folder><name>${xml(t("숙소"))}</name>${stays.map((p) => placemark(p.name, p)).join("")}</Folder>`);
  if (bin.length) folders.push(`<Folder><name>${xml(t("후보함"))}</name>${bin.map((p) => placemark(p.name, p)).join("")}</Folder>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml(title)}</name>${folders.join("")}</Document></kml>\n`;
}

/** 파일 이름에 못 쓰는 글자를 뺀다 */
export function fileName(title: string, ext: string): string {
  return `${title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "triplan"}.${ext}`;
}
