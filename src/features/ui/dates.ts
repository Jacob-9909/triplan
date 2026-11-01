import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Trip } from "@/lib/types";
import { dateLocale, makeT, type Locale } from "@/i18n/translate";

// 아래 라벨 함수는 마지막 인자로 화면 언어(usePrefs().locale)를 받는다. 안 넘기면 한국어

export type TripPhase = "upcoming" | "ongoing" | "past" | "undated";

/** 여행이 지금 기준으로 어디에 있는지 + D-day */
export function tripPhase(trip: Pick<Trip, "start_date" | "end_date">, today = new Date()) {
  if (!trip.start_date) return { phase: "undated" as TripPhase, dday: null };
  const start = parseISO(trip.start_date);
  const end = trip.end_date ? parseISO(trip.end_date) : start;
  const toStart = differenceInCalendarDays(start, today);
  if (toStart > 0) return { phase: "upcoming" as TripPhase, dday: toStart };
  if (differenceInCalendarDays(end, today) >= 0) {
    return { phase: "ongoing" as TripPhase, dday: 0, dayIndex: 1 - toStart };
  }
  return { phase: "past" as TripPhase, dday: toStart };
}

export function ddayLabel(trip: Pick<Trip, "start_date" | "end_date">, lang: Locale = "ko") {
  const t = makeT(lang);
  const p = tripPhase(trip);
  if (p.phase === "upcoming") return `D-${p.dday}`;
  if (p.phase === "ongoing") return t("여행 중 · Day {n}", { n: p.dayIndex ?? 1 });
  if (p.phase === "past") return t("다녀온 여행");
  return t("날짜 미정");
}

export function nights(trip: Pick<Trip, "start_date" | "end_date">) {
  if (!trip.start_date || !trip.end_date) return null;
  const n = differenceInCalendarDays(parseISO(trip.end_date), parseISO(trip.start_date));
  return n >= 0 ? n : null;
}

export function formatRange(trip: Pick<Trip, "start_date" | "end_date">, lang: Locale = "ko") {
  const t = makeT(lang);
  if (!trip.start_date) return t("날짜 미정");
  const locale = dateLocale(lang);
  const s = parseISO(trip.start_date);
  if (!trip.end_date) return format(s, t("yyyy. M. d (E)"), { locale });
  const e = parseISO(trip.end_date);
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${format(s, t("yyyy. M. d"), { locale })} – ${format(e, sameYear ? t("M. d") : t("yyyy. M. d"), { locale })}`;
}

export function stayLabel(trip: Pick<Trip, "start_date" | "end_date">, lang: Locale = "ko") {
  const t = makeT(lang);
  const n = nights(trip);
  if (n === null) return null;
  return n === 0 ? t("당일치기") : t("{n}박 {d}일", { n, d: n + 1 });
}
