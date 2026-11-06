"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { apiPost } from "@/lib/api";
import type { MapPoint } from "@/lib/types";

/** 한 번 열 때 찾아보는 장소 수 (Overpass 를 아끼려고) */
const MAX_PER_MOUNT = 8;
/** 요청 사이 쉬는 시간 */
const GAP_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 영업시간을 아직 찾아보지 않은(opening_hours === null) 장소를 OpenStreetMap 에서 하나씩 찾는다.
 * 한 곳씩 차례로, 사이에 조금 쉬고, 한 번 연 동안 최대 8곳. 찾아본 장소는 다시 묻지 않는다.
 * 실패(서버가 바쁨 등)하면 이번에는 멈추고 다음에 열 때 다시 한다.
 */
export function useOpeningHours({
  points,
  enabled,
  onFound,
}: {
  /** 지금 보고 있는 Day 의 장소 */
  points: MapPoint[];
  /** 편집 권한이 있을 때만 (찾은 값을 저장하므로) */
  enabled: boolean;
  /** 찾은 값('' 은 없음)으로 화면 상태를 고친다. 서버에는 이미 저장됐다 */
  onFound: (id: string, hours: string) => void;
}) {
  const tried = useRef(new Set<string>());
  const running = useRef(false);
  const stopped = useRef(false);
  // 돌고 있는 동안 새로 생긴 장소·끈 상태도 보도록 최신 값을 둔다
  const latest = useRef({ points, enabled, onFound, alive: true });
  useLayoutEffect(() => {
    latest.current = { ...latest.current, points, enabled, onFound };
  });

  const pendingKey = enabled
    ? points
        .filter((p) => p.opening_hours === null)
        .map((p) => p.id)
        .join(",")
    : "";

  useEffect(() => {
    latest.current.alive = true;
    return () => {
      latest.current.alive = false;
    };
  }, []);

  useEffect(() => {
    if (!pendingKey || running.current || stopped.current) return;
    running.current = true;
    void (async () => {
      try {
        for (;;) {
          const now = latest.current;
          if (!now.alive || !now.enabled || tried.current.size >= MAX_PER_MOUNT) break;
          const next = now.points.find((p) => p.opening_hours === null && !tried.current.has(p.id));
          if (!next) break;
          tried.current.add(next.id);
          try {
            const r = await apiPost<{ opening_hours: string }>("/api/places/hours", { point_id: next.id, patient: true });
            latest.current.onFound(next.id, r.opening_hours);
          } catch {
            stopped.current = true;
            break;
          }
          await sleep(GAP_MS);
        }
      } finally {
        running.current = false;
      }
    })();
  }, [pendingKey]);
}
