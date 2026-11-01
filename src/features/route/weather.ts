"use client";

import { useEffect, useState } from "react";
import { addDays, format, max, min, parseISO } from "date-fns";

export interface DayForecast {
  emoji: string;
  label: string;
  max: number;
  min: number;
  /** 강수 확률(%) */
  rain: number | null;
}

/** WMO 날씨 코드 → 이모지·이름 */
function describe(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: "☀️", label: "맑음" };
  if (code <= 2) return { emoji: "🌤️", label: "구름 조금" };
  if (code === 3) return { emoji: "☁️", label: "흐림" };
  if (code <= 48) return { emoji: "🌫️", label: "안개" };
  if (code <= 57) return { emoji: "🌦️", label: "이슬비" };
  if (code <= 67 || (code >= 80 && code <= 82)) return { emoji: "🌧️", label: "비" };
  if (code <= 77 || code === 85 || code === 86) return { emoji: "🌨️", label: "눈" };
  return { emoji: "⛈️", label: "뇌우" };
}

/** 예보는 오늘부터 16일 안쪽만 나온다 */
const RANGE_DAYS = 15;

/**
 * 여행 날짜 중 예보가 나오는 날의 날씨 (Open-Meteo, 키 없음). 키는 "yyyy-MM-dd".
 * ponytail: 여행지 대표 좌표 하나로 묻는다. 도시를 여러 곳 도는 여행이면 Day 장소 좌표로 바꾸면 된다
 */
export function useForecast(lat: number | undefined, lng: number | undefined, start: string | null, end: string | null) {
  const [data, setData] = useState<Map<string, DayForecast>>(new Map());

  useEffect(() => {
    if (lat == null || lng == null || !start || !end) return;
    const today = new Date();
    const from = max([parseISO(start), today]);
    const to = min([parseISO(end), addDays(today, RANGE_DAYS)]);
    if (from > to) return;
    const params = new URLSearchParams({
      latitude: lat.toFixed(3),
      longitude: lng.toFixed(3),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
      start_date: format(from, "yyyy-MM-dd"),
      end_date: format(to, "yyyy-MM-dd"),
    });
    const ctrl = new AbortController();
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const d = j?.daily;
        if (!d?.time) return;
        const out = new Map<string, DayForecast>();
        (d.time as string[]).forEach((date, i) => {
          if (d.weather_code[i] == null) return;
          out.set(date, {
            ...describe(d.weather_code[i]),
            max: Math.round(d.temperature_2m_max[i]),
            min: Math.round(d.temperature_2m_min[i]),
            rain: d.precipitation_probability_max[i],
          });
        });
        setData(out);
      })
      // 예보는 덤이라 실패하면 안 보여 준다
      .catch(() => {});
    return () => ctrl.abort();
  }, [lat, lng, start, end]);

  return data;
}
