import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { Trip } from "@/lib/types";

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

export function ddayLabel(trip: Pick<Trip, "start_date" | "end_date">) {
  const p = tripPhase(trip);
  if (p.phase === "upcoming") return `D-${p.dday}`;
  if (p.phase === "ongoing") return `여행 중 · Day ${p.dayIndex}`;
  if (p.phase === "past") return "다녀온 여행";
  return "날짜 미정";
}

export function nights(trip: Pick<Trip, "start_date" | "end_date">) {
  if (!trip.start_date || !trip.end_date) return null;
  const n = differenceInCalendarDays(parseISO(trip.end_date), parseISO(trip.start_date));
  return n >= 0 ? n : null;
}

export function formatRange(trip: Pick<Trip, "start_date" | "end_date">) {
  if (!trip.start_date) return "날짜 미정";
  const s = parseISO(trip.start_date);
  if (!trip.end_date) return format(s, "yyyy. M. d (E)", { locale: ko });
  const e = parseISO(trip.end_date);
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${format(s, "yyyy. M. d", { locale: ko })} – ${format(e, sameYear ? "M. d" : "yyyy. M. d", { locale: ko })}`;
}

export function stayLabel(trip: Pick<Trip, "start_date" | "end_date">) {
  const n = nights(trip);
  if (n === null) return null;
  return n === 0 ? "당일치기" : `${n}박 ${n + 1}일`;
}
