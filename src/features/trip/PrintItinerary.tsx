"use client";

import { addDays, format, parseISO } from "date-fns";
import type { MapPoint, RouteLeg, TravelDoc, Trip } from "@/lib/types";
import { adjacentLegs, buildSchedule, DEFAULT_STAY, formatDuration, formatTime } from "@/features/route/schedule";
import { METHOD_META } from "@/features/route/meta";
import { categoryStyle } from "@/features/map/pointStyle";
import { docsOnDay } from "@/features/prep/dayDocs";
import { DOC_META } from "@/features/prep/DocsPanel";
import { formatRange, nights, stayLabel } from "@/features/ui/dates";
import { usePrefs } from "@/i18n/I18nProvider";

/**
 * 인쇄용 일정표. 화면에는 안 보이고 인쇄(또는 PDF 저장)할 때만 나온다.
 * Day 마다 한 장: 그날 예약 + 시간표(도착–출발, 머무는 시간, 다음 장소까지 이동).
 * 지도는 인쇄가 불안정해서 넣지 않고, 장소마다 좌표 대신 이름·분류·메모를 적는다
 */
export default function PrintItinerary({
  trip,
  points,
  legs,
  docs,
}: {
  trip: Trip;
  points: MapPoint[];
  legs: RouteLeg[];
  docs: TravelDoc[];
}) {
  const { t, locale, df } = usePrefs();
  const dayCount = (nights(trip) ?? -1) + 1;
  const maxDay = Math.max(dayCount, 0, ...points.map((p) => p.day_number ?? 0));
  const ofDay = (d: number | null) =>
    points.filter((p) => p.day_number === d).sort((a, b) => (a.visit_order ?? 99) - (b.visit_order ?? 99));
  const bin = ofDay(null);
  const stay = stayLabel(trip, locale);

  return (
    <div className="hidden text-[11pt] leading-snug text-black print:block">
      <header className="mb-4 border-b-2 border-black pb-2">
        <h1 className="text-[20pt] font-extrabold">{trip.title}</h1>
        <p className="mt-0.5 text-[10pt]">
          {[trip.country, trip.region].filter(Boolean).map((s) => t(s!)).join(" · ")} · {formatRange(trip, locale)}
          {stay && ` · ${stay}`}
        </p>
      </header>

      {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => {
        const day = ofDay(d);
        const dayLegs = adjacentLegs(day, legs);
        const legAfter = new Map(dayLegs.map((l) => [l.from_point_id, l]));
        const schedule = buildSchedule(day, dayLegs);
        const date = trip.start_date ? addDays(parseISO(trip.start_date), d - 1) : null;
        const bookings = date ? docsOnDay(docs, format(date, "yyyy-MM-dd")) : [];
        if (day.length === 0 && bookings.length === 0) return null;
        return (
          <section key={d} className="mb-5 break-inside-avoid-page [&:not(:first-of-type)]:break-before-page">
            <h2 className="mb-1.5 flex items-baseline gap-2 border-b border-black/40 pb-1 text-[14pt] font-bold">
              Day {d}
              {date && <span className="text-[10pt] font-semibold">{format(date, t("M월 d일 (E)"), { locale: df })}</span>}
            </h2>
            {bookings.length > 0 && (
              <ul className="mb-2 space-y-0.5 text-[9.5pt]">
                {bookings.map(({ doc }) => (
                  <li key={doc.id}>
                    ▸ {t(DOC_META[doc.type].label)} · {doc.title}
                    {doc.provider && ` · ${doc.provider}`}
                    {doc.confirmation_code && ` · ${t("예약번호")} ${doc.confirmation_code}`}
                  </li>
                ))}
              </ul>
            )}
            <table className="w-full border-collapse text-[10pt]">
              <tbody>
                {day.map((p, i) => {
                  const s = schedule.get(p.id);
                  const leg = i < day.length - 1 ? legAfter.get(p.id) : undefined;
                  return (
                    <tr key={p.id} className="break-inside-avoid border-b border-black/15 align-top">
                      <td className="w-[7.5rem] whitespace-nowrap py-1.5 pr-3 font-mono tabular-nums">
                        {s ? `${formatTime(s.arrive)}–${formatTime(s.leave)}` : ""}
                      </td>
                      <td className="py-1.5">
                        <span className="font-bold">
                          {i + 1}. {p.name}
                        </span>
                        <span className="ml-1.5 text-[9pt]">
                          {t(categoryStyle(p.category).label)} · {t("{time} 머묾", { time: formatDuration(p.stay_min ?? DEFAULT_STAY, locale) })}
                        </span>
                        {p.memo && <p className="mt-0.5 whitespace-pre-line text-[9pt]">{p.memo}</p>}
                        {leg && (
                          <p className="mt-1 text-[9pt] italic">
                            ↓ {t(METHOD_META[leg.method].label)}
                            {leg.duration_min != null && ` ${formatDuration(leg.duration_min, locale)}`}
                            {leg.distance_km != null && ` · ${Math.round(leg.distance_km * 10) / 10}km`}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}

      {bin.length > 0 && (
        <section className="mt-4 break-inside-avoid">
          <h2 className="mb-1 border-b border-black/40 pb-1 text-[12pt] font-bold">{t("후보함")}</h2>
          <p className="text-[10pt]">{bin.map((p) => p.name).join(" · ")}</p>
        </section>
      )}
      <p className="mt-6 text-[8pt] text-black/60">Triplan</p>
    </div>
  );
}
