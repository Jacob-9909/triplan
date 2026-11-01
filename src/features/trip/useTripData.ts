"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { MapPoint, RouteLeg, Trip } from "@/lib/types";
import { useTripChanges } from "@/lib/realtime";

export function useTripData(tripId: string) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [legs, setLegs] = useState<RouteLeg[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);
  /** 열어 둔 사이에 초대 취소·링크 변경·삭제 등으로 접근할 수 없게 됨 */
  const [revoked, setRevoked] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const tripData = await apiGet<Trip | null>(`/api/trips/${tripId}`);
      if (!tripData) {
        setNotConfigured(true);
        return;
      }
      setTrip(tripData);
      const [pointData, legData] = await Promise.all([
        apiGet<MapPoint[]>(`/api/map-points?trip_id=${tripId}`),
        apiGet<RouteLeg[]>(`/api/route-legs?trip_id=${tripId}`),
      ]);
      setPoints(pointData);
      setLegs(legData);
    } catch {
      setNotConfigured(true);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const tripData = await apiGet<Trip | null>(`/api/trips/${tripId}`);
        if (cancelled) return;
        setTrip(tripData);

        const [pointData, legData] = await Promise.all([
          apiGet<MapPoint[]>(`/api/map-points?trip_id=${tripId}`),
          apiGet<RouteLeg[]>(`/api/route-legs?trip_id=${tripId}`),
        ]);
        if (!cancelled) {
          setPoints(pointData);
          setLegs(legData);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setNotConfigured(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // 다른 사람이 바꾸면 화면 깜빡임 없이 조용히 다시 불러온다. 실패하면 지금 화면을 그대로 둔다
  useTripChanges(tripId, ["trips", "map_points", "route_legs", "access"], () => {
    void Promise.all([
      apiGet<Trip>(`/api/trips/${tripId}`),
      apiGet<MapPoint[]>(`/api/map-points?trip_id=${tripId}`),
      apiGet<RouteLeg[]>(`/api/route-legs?trip_id=${tripId}`),
    ])
      .then(([t, p, l]) => {
        setTrip(t);
        setPoints(p);
        setLegs(l);
        setRevoked(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && [401, 403, 404].includes(err.status)) setRevoked(true);
      });
  });

  return { trip, points, legs, loading, notConfigured, revoked, setTrip, setPoints, setLegs, refresh };
}

/** 순서 변경: visit_order 재정렬 저장 */
export async function persistOrder(_tripId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, i) =>
      apiPatch(`/api/map-points/${id}`, { visit_order: i + 1 }),
    ),
  );
}

/** 포인트 추가 */
export async function addPoint(
  tripId: string,
  draft: { name: string; category: string; color?: string | null; memo: string | null; lat: number; lng: number },
  dayNumber: number,
  visitOrder: number,
): Promise<MapPoint | null> {
  try {
    return await apiPost<MapPoint>("/api/map-points", {
      ...draft,
      trip_id: tripId,
      day_number: dayNumber,
      visit_order: visitOrder,
    });
  } catch {
    return null;
  }
}

/** 인접 구간 leg 확보 — 없으면 생성 */
export async function ensureLeg(
  tripId: string,
  fromPointId: string,
  toPointId: string,
): Promise<RouteLeg | null> {
  try {
    const existing = await apiGet<RouteLeg | null>(
      `/api/route-legs?trip_id=${tripId}&from_point_id=${fromPointId}&to_point_id=${toPointId}`,
    );
    if (existing) return existing;
    return await apiPost<RouteLeg>("/api/route-legs", {
      trip_id: tripId,
      from_point_id: fromPointId,
      to_point_id: toPointId,
      method: "transit",
    });
  } catch {
    return null;
  }
}

/** 포인트 삭제 (연결된 구간은 DB에서 함께 지워진다) */
export async function deletePoint(id: string) {
  try {
    await apiDelete(`/api/map-points/${id}`);
    return true;
  } catch {
    return false;
  }
}

export async function updateLeg(id: string, patch: Partial<RouteLeg>) {
  await apiPatch(`/api/route-legs/${id}`, patch);
}
