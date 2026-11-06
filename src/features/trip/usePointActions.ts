"use client";

import type { Dispatch, SetStateAction } from "react";
import type { MapPoint, RouteLeg } from "@/lib/types";
import { apiPatch } from "@/lib/api";
import { scheduleDelete, UNDO_MS } from "@/lib/deferredDelete";
import { toast } from "@/features/ui/Toast";
import { useT } from "@/i18n/I18nProvider";
import type { PointDraft } from "@/features/map";
import type { PointPatch } from "./PlaceDetail";
import { addPoint, ensureLeg, persistOrder } from "./useTripData";

/**
 * 장소를 더하고, 옮기고, 순서를 바꾸고, 지우는 일 (일정 탭·기록 탭이 같이 쓴다).
 * 화면은 저장이 끝난 것만 반영하고, 삭제는 잠깐 기다렸다 보내 되돌릴 수 있게 한다.
 */
export function usePointActions({
  tripId,
  points,
  legs,
  setPoints,
  setLegs,
}: {
  tripId: string;
  points: MapPoint[];
  legs: RouteLeg[];
  setPoints: Dispatch<SetStateAction<MapPoint[]>>;
  setLegs: Dispatch<SetStateAction<RouteLeg[]>>;
}) {
  const t = useT();

  /** 그 Day(null 이면 후보함)의 장소를 방문 순서대로 */
  const pointsOf = (d: number | null) =>
    points.filter((p) => p.day_number === d).sort((a, b) => (a.visit_order ?? 99) - (b.visit_order ?? 99));

  /** 구간을 만들거나 찾아서 화면 목록에 넣는다 */
  async function link(a: string, b: string) {
    const leg = await ensureLeg(tripId, a, b);
    if (leg) setLegs((prev) => [...prev.filter((l) => l.id !== leg.id), leg]);
    return leg;
  }

  async function savePoint(id: string, patch: PointPatch) {
    try {
      await apiPatch(`/api/map-points/${id}`, patch);
      setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : t("저장하지 못했어요.");
    }
  }

  /** 순서 저장. 후보함이 아니면 새로 이웃한 장소 사이 구간을 확보한다 */
  async function reorder(orderedIds: string[], inBin: boolean) {
    setPoints((prev) =>
      prev.map((p) => {
        const idx = orderedIds.indexOf(p.id);
        return idx >= 0 ? { ...p, visit_order: idx + 1 } : p;
      })
    );
    await persistOrder(tripId, orderedIds);
    if (inBin) return;
    for (let i = 0; i < orderedIds.length - 1; i++) await link(orderedIds[i], orderedIds[i + 1]);
  }

  /** 다른 Day 나 후보함(null)으로 옮긴다: 새 자리의 맨 끝에 붙이고, 비운 자리 앞뒤는 다시 잇는다 */
  async function movePoint(id: string, target: number | null) {
    const p = points.find((x) => x.id === id);
    if (!p || p.day_number === target) return null;
    const from = pointsOf(p.day_number);
    const idx = from.findIndex((x) => x.id === id);
    const dest = pointsOf(target);
    const order = Math.max(0, ...dest.map((x) => x.visit_order ?? 0)) + 1;
    try {
      await apiPatch(`/api/map-points/${id}`, { day_number: target, visit_order: order });
    } catch (e) {
      return e instanceof Error ? e.message : t("저장하지 못했어요.");
    }
    setPoints((prev) => prev.map((x) => (x.id === id ? { ...x, day_number: target, visit_order: order } : x)));
    if (p.day_number != null && from[idx - 1] && from[idx + 1]) await link(from[idx - 1].id, from[idx + 1].id);
    if (target != null && dest.length) await link(dest[dest.length - 1].id, id);
    return null;
  }

  /** 구역째 Day 로: 그날 마지막 장소 뒤에 순서대로 붙이고 구간을 잇는다 (경로는 그날을 열 때 받는다) */
  async function moveGroup(ids: string[], target: number) {
    const dest = pointsOf(target);
    const base = Math.max(0, ...dest.map((x) => x.visit_order ?? 0));
    // 하나씩 저장하고 저장된 것만 화면에 반영한다. 중간에 실패하면 남은 곳은 후보함에 그대로 있다
    for (const [i, id] of ids.entries()) {
      await apiPatch(`/api/map-points/${id}`, { day_number: target, visit_order: base + i + 1 });
      setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, day_number: target, visit_order: base + i + 1 } : p)));
    }
    const chain = [...(dest.length ? [dest[dest.length - 1].id] : []), ...ids];
    for (let i = 0; i < chain.length - 1; i++) await link(chain[i], chain[i + 1]);
  }

  /** 그날(null 이면 후보함) 맨 끝에 새 장소 */
  async function createPoint(draft: PointDraft, at: { lat: number; lng: number }, day: number | null) {
    const dayPoints = pointsOf(day);
    const maxOrder = Math.max(0, ...dayPoints.map((p) => p.visit_order ?? 0));
    const created = await addPoint(tripId, { ...draft, lat: at.lat, lng: at.lng }, day, maxOrder + 1);
    if (!created) {
      toast({ message: t("장소를 추가하지 못했어요."), tone: "error" });
      return null;
    }
    setPoints((prev) => [...prev, created]);
    const prevPoint = day == null ? null : dayPoints[dayPoints.length - 1];
    if (prevPoint) await link(prevPoint.id, created.id);
    return created;
  }

  /** 화면에서 바로 빼고, 몇 초 동안 되돌릴 수 있게 한 뒤 지운다 */
  function removePoint(id: string) {
    const p = points.find((x) => x.id === id);
    if (!p) return;
    const day = pointsOf(p.day_number);
    const idx = day.findIndex((x) => x.id === id);
    const removedLegs = legs.filter((l) => l.from_point_id === id || l.to_point_id === id);
    setPoints((prev) => prev.filter((x) => x.id !== id));
    setLegs((prev) => prev.filter((l) => l.from_point_id !== id && l.to_point_id !== id));
    const restore = () => {
      setPoints((prev) => (prev.some((x) => x.id === id) ? prev : [...prev, p]));
      setLegs((prev) => [...prev.filter((l) => !removedLegs.some((r) => r.id === l.id)), ...removedLegs]);
    };
    const cancel = scheduleDelete(`/api/map-points/${id}`, {
      onFailed: () => {
        restore();
        toast({ message: t("삭제하지 못했어요."), tone: "error" });
      },
    });
    // 가운데 장소면 앞뒤를 바로 잇는다. 되돌리면 원래 구간이 다시 쓰이고 이 구간은 쓰이지 않는다
    const before = day[idx - 1];
    const after = day[idx + 1];
    if (p.day_number != null && before && after) void link(before.id, after.id);
    toast({
      message: t("'{name}' 삭제했어요", { name: p.name }),
      action: { label: t("되돌리기"), onClick: () => cancel() && restore() },
      duration: UNDO_MS,
    });
  }

  /** 서버가 이미 저장한 값을 화면에만 반영 (영업시간 조회처럼 API 가 직접 저장한 경우) */
  function patchLocal(id: string, patch: Partial<MapPoint>) {
    setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  return { pointsOf, savePoint, reorder, movePoint, moveGroup, createPoint, removePoint, patchLocal };
}

export type PointActions = ReturnType<typeof usePointActions>;
