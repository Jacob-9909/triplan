"use client";

import { useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { Clock, ExternalLink, Globe, MapPinned, Phone } from "lucide-react";
import type { MapPoint } from "@/lib/types";
import type { PlaceInfo } from "@/lib/placeInfo";
import { apiGet } from "@/lib/api";
import { formatRanges, hoursOn, osmWeekday, parseOpeningHours } from "@/features/route/openingHours";
import { usePrefs } from "@/i18n/I18nProvider";

// 2026-11-16 은 월요일: 요일 이름(월~일)을 화면 언어로 뽑는 기준
const MONDAY = new Date(2026, 10, 16);

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * 장소 상세 맨 위 "장소 정보": 사진·설명(위키백과), 영업시간·전화·웹사이트·주소(OpenStreetMap).
 * 가는 날(visitDate)의 요일을 굵게 보여 준다. 찾은 게 없으면 한 줄만.
 */
export default function PlaceInfoCard({
  point,
  visitDate,
  onPointPatch,
}: {
  point: MapPoint;
  /** 가는 날 "yyyy-MM-dd" (후보함·날짜 없는 여행이면 null) */
  visitDate: string | null;
  /** 서버가 장소에 복사한 영업시간·사진을 화면에도 반영 */
  onPointPatch?: (patch: Partial<MapPoint>) => void;
}) {
  const { t, locale, df } = usePrefs();
  // 이름·위치·언어가 바뀌면 다시 찾는다. 받은 결과는 그때의 key 와 함께 두고, key 가 다르면 불러오는 중으로 본다
  const key = `${point.id}|${point.name}|${point.lat}|${point.lng}|${locale}`;
  const [loaded, setLoaded] = useState<{ key: string; info: PlaceInfo | null } | null>(null);
  useEffect(() => {
    let live = true;
    apiGet<{ info: PlaceInfo | null; point: Partial<MapPoint> | null }>(`/api/places/info?point_id=${point.id}&locale=${locale}`)
      .then((r) => {
        if (!live) return;
        setLoaded({ key, info: r.info });
        if (r.point) onPointPatch?.(r.point);
      })
      .catch(() => live && setLoaded({ key, info: null }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key 가 바뀔 때만
  }, [key]);
  const info = loaded?.key === key ? loaded.info : undefined;

  if (info === undefined) return <div className="skeleton h-20 rounded-2xl" />;
  const empty = !info || !(info.hours || info.phone || info.website || info.address || info.summary || info.image);
  if (empty) return <p className="text-xs text-foreground/68">{t("공개 지도에서 찾은 장소 정보가 없어요.")}</p>;

  const rules = parseOpeningHours(info.hours);
  const visitDay = visitDate ? osmWeekday(new Date(`${visitDate}T00:00:00`).getDay()) : null;

  return (
    <section className="space-y-3">
      {info.image && (
        // eslint-disable-next-line @next/next/no-img-element -- 위키미디어 외부 이미지, 크기를 모른다
        <img src={info.image} alt="" loading="lazy" className="aspect-[16/9] w-full rounded-2xl bg-surface-muted object-cover" />
      )}
      {info.summary && <p className="line-clamp-4 text-sm leading-relaxed text-foreground/80">{info.summary}</p>}

      {info.hours && (
        <div className="flex gap-2.5 text-sm">
          <Clock size={16} className="mt-0.5 shrink-0 text-foreground/68" aria-hidden />
          {rules && new Set(Array.from({ length: 7 }, (_, d) => JSON.stringify(hoursOn(rules, d)))).size === 1 ? (
            // 일주일 내내 같으면 한 줄
            <span className="tabular-nums text-foreground/80">
              {t("매일")} {(() => {
                const ranges = hoursOn(rules, 0);
                return ranges === null ? "–" : ranges.length === 0 ? t("휴무") : formatRanges(ranges);
              })()}
            </span>
          ) : rules ? (
            <dl className="grid flex-1 grid-cols-[2.5rem_1fr] gap-y-0.5 tabular-nums">
              {Array.from({ length: 7 }, (_, d) => {
                const ranges = hoursOn(rules, d);
                const on = d === visitDay;
                return (
                  <div key={d} className={`contents ${on ? "font-bold text-primary-strong" : "text-foreground/80"}`}>
                    <dt>{format(addDays(MONDAY, d), "EEE", { locale: df })}</dt>
                    <dd>{ranges === null ? "–" : ranges.length === 0 ? t("휴무") : formatRanges(ranges)}</dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <span className="break-all font-mono text-xs leading-relaxed text-foreground/80">{info.hours}</span>
          )}
        </div>
      )}
      {info.phone && (
        <a href={`tel:${info.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2.5 text-sm font-medium text-primary-strong">
          <Phone size={16} className="shrink-0" aria-hidden /> {info.phone}
        </a>
      )}
      {info.website && (
        <a href={info.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm font-medium text-primary-strong">
          <Globe size={16} className="shrink-0" aria-hidden /> {hostOf(info.website)}
        </a>
      )}
      {info.address && (
        <p className="flex items-start gap-2.5 text-sm text-foreground/80">
          <MapPinned size={16} className="mt-0.5 shrink-0 text-foreground/68" aria-hidden /> {info.address}
        </p>
      )}

      <p className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-foreground/68">
        {info.osm && (
          <a href={`https://www.openstreetmap.org/${info.osm.type}/${info.osm.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
            © OpenStreetMap <ExternalLink size={10} aria-hidden />
          </a>
        )}
        {info.wikipedia && (
          <a href={info.wikipedia} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
            {t("위키백과")} <ExternalLink size={10} aria-hidden />
          </a>
        )}
        <span>{t("공개 자료라 실제와 다를 수 있어요")}</span>
      </p>
    </section>
  );
}
