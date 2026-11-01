"use client";

import { useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import type { Trip } from "@/lib/types";
import type { DayForecast } from "./weather";
import { usePrefs } from "@/i18n/I18nProvider";
import { Inbox } from "lucide-react";

export interface DayTabsProps {
  trip: Pick<Trip, "start_date" | "end_date">;
  /** 제어형으로 쓸 때의 현재 선택 day_number (1-based) */
  value?: number | null;
  /** 선택 변경 콜백 */
  onChange?: (dayNumber: number) => void;
  /** 날짜("yyyy-MM-dd")별 예보 */
  forecast?: Map<string, DayForecast>;
  /** 오늘에 해당하는 day_number */
  today?: number | null;
  /** 있으면 맨 끝에 후보함 탭(값 BIN_DAY)을 붙인다. 숫자는 담긴 장소 수 */
  bin?: number;
}

/** 아직 Day 를 정하지 않은 장소(day_number 없음)를 모아 보는 탭의 값 */
export const BIN_DAY = 0;

function getDays(trip: Pick<Trip, "start_date" | "end_date">): Date[] {
  if (!trip.start_date || !trip.end_date) return [];
  const start = parseISO(trip.start_date);
  const end = parseISO(trip.end_date);
  const count = Math.max(1, differenceInCalendarDays(end, start) + 1);
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export default function DayTabs({ trip, value = null, onChange, forecast, today = null, bin }: DayTabsProps) {
  const { t, df } = usePrefs();
  const days = getDays(trip);
  const [internalDay, setInternalDay] = useState(1);

  const selected = value ?? internalDay;

  function handleSelect(dayNumber: number) {
    setInternalDay(dayNumber);
    onChange?.(dayNumber);
  }

  if (days.length === 0) {
    return (
      <div className="card px-4 py-3 text-sm text-foreground/72">
        {t("여행 날짜를 설정하면 Day별 일정이 표시됩니다.")}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={t("여행 일차 선택")}
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {days.map((date, i) => {
        const dayNumber = i + 1;
        const isActive = selected === dayNumber;
        const fc = forecast?.get(format(date, "yyyy-MM-dd"));
        return (
          <button
            key={dayNumber}
            role="tab"
            aria-selected={isActive}
            onClick={() => handleSelect(dayNumber)}
            className={`flex shrink-0 flex-col items-center rounded-2xl border px-4 py-2 transition-all md:px-5 md:py-2.5 ${
              isActive
                ? "border-primary bg-primary text-white shadow-md"
                : "border-border-subtle bg-surface text-foreground hover:border-primary hover:bg-primary-soft"
            }`}
          >
            <span className={`text-xs font-semibold ${isActive ? "text-white" : "text-primary-strong"}`}>
              {dayNumber === today ? t("오늘") : `Day ${dayNumber}`}
            </span>
            <span className={`mt-0.5 text-[11px] ${isActive ? "text-white" : "text-foreground/68"}`}>
              {format(date, t("M/d(E)"), { locale: df })}
            </span>
            {fc && (
              <span
                title={fc.rain != null ? t("{label} · 비 올 확률 {rain}%", { label: t(fc.label), rain: fc.rain }) : t(fc.label)}
                className={`mt-0.5 text-[11px] tabular-nums ${isActive ? "text-white" : "text-foreground/72"}`}
              >
                <span role="img" aria-label={t(fc.label)}>{fc.emoji}</span> {fc.max}°/{fc.min}°
              </span>
            )}
          </button>
        );
      })}
      {bin !== undefined && (
        <button
          role="tab"
          aria-selected={selected === BIN_DAY}
          onClick={() => handleSelect(BIN_DAY)}
          className={`flex shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-2 transition-all md:px-5 md:py-2.5 ${
            selected === BIN_DAY
              ? "border-ink bg-ink text-white shadow-md"
              : "border-border-subtle bg-surface-muted text-foreground hover:border-ink"
          }`}
        >
          <span className="flex items-center gap-1 text-xs font-semibold">
            <Inbox size={13} aria-hidden /> {t("후보함")}
          </span>
          <span className={`mt-0.5 text-[11px] ${selected === BIN_DAY ? "text-white" : "text-foreground/68"}`}>
            {t("{n}곳", { n: bin })}
          </span>
        </button>
      )}
    </div>
  );
}
