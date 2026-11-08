"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ApiError, apiPost } from "@/lib/api";
import type { MapPoint, RouteLeg, RouteOption } from "@/lib/types";
import { updateLeg } from "@/features/trip/useTripData";
import { estimateDirections } from "./directions";
import { autoMethod, isStale, providerFor } from "./routeOptions";

export type RouteStatus = "loading" | "quota" | "failed";

/** 실패한 경로는 이 시간 안에는 다시 묻지 않는다 */
const RETRY_MS = 10 * 60_000;

/**
 * 구간 실제 경로 받기.
 * - 그날 구간의 고른 이동수단(대중교통 제외)은 Day 를 열 때 받는다. 한 번 받은 건 저장돼 다시 묻지 않는다
 * - 한국 대중교통은 저장하면 안 돼서(ODsay 약관) 구간 카드를 펼칠 때만 받아 이 화면에만 둔다
 * - 사람이 고르지 않은 구간은 처음에 거리로 도보/대중교통을 정한다
 */
export function useRouteFetcher({
  tripId,
  legs,
  points,
  options,
  setOptions,
  setLegs,
  enabled,
}: {
  tripId: string;
  /** 지금 보고 있는 Day 의 구간 */
  legs: RouteLeg[];
  points: MapPoint[];
  /** 저장된 경로 */
  options: RouteOption[];
  setOptions: Dispatch<SetStateAction<RouteOption[]>>;
  setLegs: Dispatch<SetStateAction<RouteLeg[]>>;
  /** 편집 권한이 있고 다녀온 여행이 아닐 때만 새로 받는다 */
  enabled: boolean;
}) {
  const [live, setLive] = useState<RouteOption[]>([]);
  const [status, setStatus] = useState<Map<string, RouteStatus>>(new Map());
  const failedAt = useRef(new Map<string, number>());
  const inflight = useRef(new Set<string>());
  const quota = useRef(false);
  const defaulted = useRef(new Set<string>());
  // 비동기 응답이 올 때 최신 값을 보도록
  const latest = useRef({ legs, points, options, live });
  useLayoutEffect(() => {
    latest.current = { legs, points, options, live };
  });

  const all = useMemo(() => [...options, ...live], [options, live]);

  const ends = (leg: RouteLeg) => {
    const { points } = latest.current;
    const from = points.find((p) => p.id === leg.from_point_id);
    const to = points.find((p) => p.id === leg.to_point_id);
    return from && to ? { from, to } : null;
  };

  const setKey = (key: string, s: RouteStatus | null) =>
    setStatus((prev) => {
      const next = new Map(prev);
      if (s) next.set(key, s);
      else next.delete(key);
      return next;
    });

  /** 받은 경로가 구간의 이동수단이고 사람이 고친 시간이 아니면 구간 시간을 경로 시간으로 */
  const applyDuration = useCallback(
    (opt: RouteOption) => {
      const leg = latest.current.legs.find((l) => l.id === opt.leg_id);
      if (!leg || leg.method !== opt.method || leg.duration_manual) return;
      if (leg.duration_min === opt.duration_min && leg.distance_km === opt.distance_km) return;
      const patch = { duration_min: opt.duration_min, distance_km: opt.distance_km };
      setLegs((prev) => prev.map((l) => (l.id === leg.id ? { ...l, ...patch } : l)));
      void updateLeg(leg.id, patch);
    },
    [setLegs]
  );

  const ensure = useCallback(
    (legId: string, method: RouteLeg["method"]) => {
      if (!enabled) return;
      const leg = latest.current.legs.find((l) => l.id === legId);
      const e = leg && ends(leg);
      if (!leg || !e) return;
      const provider = providerFor(method, e.from, e.to);
      if (!provider) return;
      const key = `${legId}:${method}`;
      if (inflight.current.has(key)) return;
      if (provider === "odsay" && quota.current) return setKey(key, "quota");
      const have = [...latest.current.options, ...latest.current.live].find((o) => o.leg_id === legId && o.method === method);
      if (have && !isStale(have, e.from, e.to)) return applyDuration(have);
      if (Date.now() - (failedAt.current.get(key) ?? 0) < RETRY_MS) return;

      inflight.current.add(key);
      setKey(key, "loading");
      apiPost<RouteOption>("/api/route-options", { trip_id: tripId, leg_id: legId, method })
        .then((opt) => {
          const put = (prev: RouteOption[]) => [...prev.filter((o) => !(o.leg_id === legId && o.method === method)), opt];
          if (opt.id.startsWith("live-")) setLive(put);
          else setOptions(put);
          setKey(key, null);
          applyDuration(opt);
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 429) {
            quota.current = true;
            setKey(key, "quota");
          } else {
            failedAt.current.set(key, Date.now());
            setKey(key, "failed");
          }
        })
        .finally(() => inflight.current.delete(key));
    },
    [enabled, tripId, setOptions, applyDuration]
  );

  // Day 를 열면: 기본 이동수단을 정하고, 대중교통이 아닌 고른 수단의 경로를 받는다
  useEffect(() => {
    if (!enabled) return;
    for (const leg of legs) {
      const e = ends(leg);
      if (!e) continue;
      let method = leg.method;
      if (!defaulted.current.has(leg.id)) {
        defaulted.current.add(leg.id);
        const auto = autoMethod(leg, e.from, e.to);
        if (auto) {
          method = auto;
          setLegs((prev) => prev.map((l) => (l.id === leg.id ? { ...l, method } : l)));
          latest.current.legs = latest.current.legs.map((l) => (l.id === leg.id ? { ...l, method } : l));
          void updateLeg(leg.id, { method });
        }
      }
      if (method !== "transit") ensure(leg.id, method);
    }
  }, [legs, options, enabled, ensure, setLegs]);

  /** 사람이 이동수단을 고름: 고른 것으로 표시하고, 받아 둔 경로(없으면 추정치) 시간으로 */
  const choose = useCallback(
    (legId: string, method: RouteLeg["method"]) => {
      const leg = latest.current.legs.find((l) => l.id === legId);
      const e = leg && ends(leg);
      // 핀을 옮긴 뒤의 낡은 경로 시간은 쓰지 않는다. ensure 가 새로 받으면 applyDuration 이 바꾼다
      const opt = [...latest.current.options, ...latest.current.live].find(
        (o) => o.leg_id === legId && o.method === method && e && !isStale(o, e.from, e.to)
      );
      const est = e && estimateDirections(e.from, e.to, method);
      const patch: Partial<RouteLeg> = {
        method,
        method_chosen: true,
        duration_manual: false,
        ...(opt
          ? { duration_min: opt.duration_min, distance_km: opt.distance_km }
          : est
            ? { duration_min: est.durationMin, distance_km: est.distanceKm }
            : {}),
      };
      setLegs((prev) => prev.map((l) => (l.id === legId ? { ...l, ...patch } : l)));
      latest.current.legs = latest.current.legs.map((l) => (l.id === legId ? { ...l, ...patch } : l));
      void updateLeg(legId, patch);
      ensure(legId, method);
    },
    [setLegs, ensure]
  );

  return { options: all, status, ensure, choose };
}
