"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { format, parseISO } from "date-fns";
import type { MapPoint, TravelDoc, Trip } from "@/lib/types";
import { categoryStyle } from "@/features/map/pointStyle";
import { METHOD_META } from "@/features/route/meta";
import { formatDuration, formatTime } from "@/features/route/schedule";
import { DOC_META } from "@/features/prep/DocsPanel";
import { docsOnDay } from "@/features/prep/dayDocs";
import { formatRange, stayLabel } from "@/features/ui/dates";
import { usePrefs } from "@/i18n/I18nProvider";
import type { PlanDay } from "./itinerary";

const HOTEL_WHEN = { start: "체크인", during: "숙박", end: "체크아웃" } as const;

/**
 * 인쇄용 일정표: body 에 붙여 인쇄 창을 열고, 닫히면 사라진다.
 * 화면에는 안 보이고(globals.css .print-root) 인쇄할 때만 이것만 찍힌다. 브라우저 인쇄 창에서 PDF 로 저장 가능
 */
export default function TripPrint({
  trip,
  days,
  bin,
  docs,
  onDone,
}: {
  trip: Trip;
  days: PlanDay[];
  bin: MapPoint[];
  docs: TravelDoc[];
  onDone: () => void;
}) {
  const { t, locale, df } = usePrefs();

  useEffect(() => {
    window.addEventListener("afterprint", onDone);
    // 붙인 내용이 그려진 다음 프레임에 인쇄 창을 연다
    const id = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("afterprint", onDone);
    };
  }, [onDone]);

  const stay = stayLabel(trip, locale);
  return createPortal(
    <div className="print-root">
      <header className="mb-5 border-b-2 border-black pb-3">
        <h1 className="text-[20pt] font-extrabold leading-tight">{trip.title}</h1>
        <p className="mt-1 text-[10pt]">
          {[[trip.country, trip.region].filter(Boolean).map((s) => t(s!)).join(" · "), formatRange(trip, locale), stay]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {days.map((d) => {
        const bookings = d.date ? docsOnDay(docs, d.date) : [];
        return (
          <section key={d.day} className="print-day mb-6">
            <h2 className="mb-2 border-b border-neutral-400 pb-1 text-[13pt] font-bold">
              {[`Day ${d.day}`, d.date && format(parseISO(d.date), t("M/d(E)"), { locale: df }), d.area].filter(Boolean).join(" · ")}
            </h2>
            {bookings.length > 0 && (
              <ul className="mb-2 text-[9.5pt]">
                {bookings.map(({ doc, when }) => (
                  <li key={doc.id}>
                    ■ {t(doc.type === "hotel" ? HOTEL_WHEN[when] : DOC_META[doc.type].label)} · {doc.title}
                    {doc.confirmation_code && ` · ${t("예약번호 {code}", { code: doc.confirmation_code })}`}
                  </li>
                ))}
              </ul>
            )}
            {d.stops.length === 0 ? (
              <p className="text-[10pt] text-neutral-500">{t("아직 장소가 없어요")}</p>
            ) : (
              <table className="w-full border-collapse text-[10pt]">
                <tbody>
                  {d.stops.map(({ point, arrive, leave }, i) => {
                    const leg = d.legs.find((l) => l.from_point_id === point.id);
                    return [
                      <tr key={point.id} className="align-top">
                        <td className="w-24 py-1 pr-2 font-bold tabular-nums">
                          {formatTime(arrive)}–{formatTime(leave)}
                        </td>
                        <td className="py-1">
                          <span className="font-bold">
                            {i + 1}. {point.name}
                          </span>{" "}
                          <span className="text-neutral-500">{t(categoryStyle(point.category).label)}</span>
                          {point.memo && <p className="whitespace-pre-wrap text-[9pt] text-neutral-700">{point.memo}</p>}
                        </td>
                      </tr>,
                      leg && i < d.stops.length - 1 && (
                        <tr key={leg.id}>
                          <td />
                          <td className="pb-1 text-[9pt] text-neutral-500">
                            ↓ {t(METHOD_META[leg.method].label)}
                            {leg.duration_min != null && ` ${formatDuration(leg.duration_min, locale)}`}
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            )}
          </section>
        );
      })}

      {bin.length > 0 && (
        <section className="print-day mb-6">
          <h2 className="mb-2 border-b border-neutral-400 pb-1 text-[13pt] font-bold">{t("후보함")}</h2>
          <p className="text-[10pt]">{bin.map((p) => p.name).join(" · ")}</p>
        </section>
      )}
      <p className="mt-8 text-[8pt] text-neutral-500">{t("Triplan에서 만든 일정표")}</p>
    </div>,
    document.body
  );
}
