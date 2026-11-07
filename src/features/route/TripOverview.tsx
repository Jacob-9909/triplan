"use client";

import { format, parseISO } from "date-fns";
import { ChevronRight, Inbox } from "lucide-react";
import type { MapPoint } from "@/lib/types";
import type { PlanDay } from "@/features/trip/itinerary";
import { usePrefs } from "@/i18n/I18nProvider";
import { AREA_COLORS } from "./AreaGroups";
import { BIN_DAY } from "./DayTabs";
import { formatDuration, formatTime } from "./schedule";

/** 전체 일정 보기의 Day 색 (지도 핀과 목록이 같은 색) */
export const dayColor = (day: number) => AREA_COLORS[(day - 1) % AREA_COLORS.length];

/**
 * 전체 일정 보기: Day 마다 요약 한 줄과 장소 순서. Day 를 누르면 그날로, 장소를 누르면 상세.
 * 색만으로 구분하지 않게 Day 번호와 순번을 늘 글자로 함께 적는다.
 */
export default function TripOverview({
  days,
  binCount,
  onPickDay,
  onOpen,
}: {
  days: PlanDay[];
  binCount: number;
  onPickDay: (day: number) => void;
  onOpen: (point: MapPoint) => void;
}) {
  const { t, locale, df } = usePrefs();
  const placeCount = days.reduce((s, d) => s + d.stops.length, 0);
  const travelMin = days.reduce((s, d) => s + d.travelMin, 0);

  return (
    <section className="space-y-3" aria-label={t("전체 일정")}>
      <p className="px-1 text-xs text-foreground/68">
        {[
          t("{n}일", { n: days.length }),
          t("{n}곳", { n: placeCount }),
          travelMin > 0 && t("이동 {time}", { time: formatDuration(travelMin, locale) }),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {days.map((d) => {
        const color = dayColor(d.day);
        const first = d.stops[0];
        const last = d.stops[d.stops.length - 1];
        return (
          <article key={d.day} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => onPickDay(d.day)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-muted"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] text-sm font-extrabold tabular-nums"
                style={{ borderColor: color }}
              >
                {d.day}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 text-sm font-bold">
                  Day {d.day}
                  {d.date && (
                    <span className="font-semibold text-foreground/68">{format(parseISO(d.date), t("M/d(E)"), { locale: df })}</span>
                  )}
                  {d.area && (
                    <span className="max-w-40 truncate rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary-strong">{d.area}</span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs tabular-nums text-foreground/68">
                  {first && last
                    ? [
                        `${formatTime(first.arrive)} – ${formatTime(last.leave)}`,
                        t("{n}곳", { n: d.stops.length }),
                        d.travelMin > 0 && t("이동 {time}", { time: formatDuration(d.travelMin, locale) }),
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : t("아직 장소가 없어요")}
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-foreground/45" aria-hidden />
            </button>
            {d.stops.length > 0 && (
              <ol className="border-t border-border-subtle px-2 py-1.5">
                {d.stops.map(({ point, arrive }, i) => (
                  <li key={point.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(point)}
                      className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2 text-left text-sm transition hover:bg-surface-muted"
                    >
                      <span className="w-11 shrink-0 text-xs tabular-nums text-foreground/68">{formatTime(arrive)}</span>
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold tabular-nums"
                        style={{ borderColor: color }}
                      >
                        {i + 1}
                      </span>
                      <span className="truncate font-medium">{point.name}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </article>
        );
      })}
      {binCount > 0 && (
        <button
          type="button"
          onClick={() => onPickDay(BIN_DAY)}
          className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border-subtle bg-surface-muted px-4 py-3 text-left text-sm transition hover:border-ink"
        >
          <Inbox size={18} className="shrink-0" aria-hidden />
          <span className="flex-1">
            <span className="font-bold">{t("후보함")}</span>{" "}
            <span className="text-foreground/68">{t("{n}곳은 아직 날을 정하지 않았어요", { n: binCount })}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-foreground/45" aria-hidden />
        </button>
      )}
    </section>
  );
}
