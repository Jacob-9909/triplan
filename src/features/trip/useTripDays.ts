"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TripDay } from "@/lib/types";
import { apiGet } from "@/lib/api";
import { useTripChanges } from "@/lib/realtime";

/**
 * Day 별 기록(trip_days): 구역 이름과 그날 밤 숙소. 일정 탭과 인쇄 일정표가 같이 쓴다.
 * 일기 칸은 기록 탭이 따로 다룬다.
 */
export function useTripDays(tripId: string) {
  const [dayRecords, setDayRecords] = useState<TripDay[]>([]);
  const loadDays = useCallback(
    () =>
      apiGet<TripDay[]>(`/api/trip-days?trip_id=${tripId}`)
        .then(setDayRecords)
        .catch(() => {}),
    [tripId]
  );
  useEffect(() => {
    void loadDays();
  }, [loadDays]);
  useTripChanges(tripId, ["trip_days"], () => void loadDays());
  /** Day N 밤 → 숙소 장소 id */
  const stayByNight = useMemo(
    () =>
      Object.fromEntries(dayRecords.filter((d) => d.stay_point_id).map((d) => [d.day_number, d.stay_point_id!])) as Record<number, string>,
    [dayRecords]
  );
  return { dayRecords, setDayRecords, loadDays, stayByNight };
}

export type TripDays = ReturnType<typeof useTripDays>;
