import type { MapPoint } from "@/lib/types";

/** 하루 일정: 날짜("yyyy-MM-dd", 날짜 없는 여행이면 null)와 시각(분, 0시 기준)이 붙은 장소 (전체 일정·지도 파일에 쓴다) */
export interface ExportDay {
  day: number;
  date: string | null;
  area?: string | null;
  stops: { point: MapPoint; arrive: number; leave: number }[];
}

type T = (key: string, vars?: Record<string, string | number>) => string;

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
