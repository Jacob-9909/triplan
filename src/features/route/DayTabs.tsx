"use client";

import { useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import { ko } from "date-fns/locale";
import type { Trip } from "@/lib/types";

export interface DayTabsProps {
  trip: Pick<Trip, "start_date" | "end_date">;
  /** 제어형으로 쓸 때의 현재 선택 day_number (1-based) */
  value?: number | null;
  /** 선택 변경 콜백 */
  onChange?: (dayNumber: number) => void;
}

function getDays(trip: Pick<Trip, "start_date" | "end_date">): Date[] {
  if (!trip.start_date || !trip.end_date) return [];
  const start = parseISO(trip.start_date);
  const end = parseISO(trip.end_date);
  const count = Math.max(1, differenceInCalendarDays(end, start) + 1);
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export default function DayTabs({ trip, value = null, onChange }: DayTabsProps) {
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
        여행 날짜를 설정하면 Day별 일정이 표시됩니다.
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="여행 일차 선택"
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {days.map((date, i) => {
        const dayNumber = i + 1;
        const isActive = selected === dayNumber;
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
              Day {dayNumber}
            </span>
            <span className={`mt-0.5 text-[11px] ${isActive ? "text-white" : "text-foreground/68"}`}>
              {format(date, "M/d(E)", { locale: ko })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
