"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { ChecklistItem } from "@/lib/types";
import { useTripChanges } from "@/lib/realtime";

export function useChecklist(tripId: string) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  /** 서버에서 목록 조회 (setState는 onDone 콜백에서 수행) */
  const fetchAll = useCallback(
    async (onDone: (data: ChecklistItem[]) => void) => {
      if (!tripId) {
        onDone([]);
        return;
      }
      try {
        const data = await apiGet<ChecklistItem[]>(`/api/checklist-items?trip_id=${tripId}`);
        onDone(data);
      } catch {
        onDone([]);
      }
    },
    [tripId],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchAll((data) => {
      if (cancelled) return;
      setItems(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchAll]);

  useTripChanges(tripId, ["checklist_items"], () => void fetchAll((data) => setItems(data)));

  /** 새로고침 (명시적 호출용) */
  const refresh = useCallback(async () => {
    await fetchAll((data) => setItems(data));
  }, [fetchAll]);

  const addItem = useCallback(
    async (label: string, category: string = "etc") => {
      if (!tripId || !label.trim()) return;
      try {
        const data = await apiPost<ChecklistItem>("/api/checklist-items", {
          trip_id: tripId,
          label: label.trim(),
          category,
          is_checked: false,
          sort_order: items.length,
        });
        setItems((prev) => [...prev, data]);
      } catch {}
    },
    [tripId, items.length],
  );

  const addItems = useCallback(
    async (labels: string[], categories?: string[]) => {
      if (!tripId || labels.length === 0) return;
      const rows = labels.map((label, i) => ({
        trip_id: tripId,
        label,
        category: categories?.[i] ?? "etc",
        is_checked: false,
        sort_order: items.length + i,
      }));
      try {
        const data = await apiPost<ChecklistItem[]>("/api/checklist-items", rows);
        setItems((prev) => [...prev, ...data]);
      } catch {}
    },
    [tripId, items.length],
  );

  const toggleItem = useCallback(async (id: string) => {
    let next: boolean | null = null;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        next = !it.is_checked;
        return { ...it, is_checked: next };
      }),
    );
    if (next === null) return;
    try {
      await apiPatch(`/api/checklist-items/${id}`, { is_checked: next });
    } catch {}
  }, []);

  const removeItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      await apiDelete(`/api/checklist-items/${id}`);
    } catch {}
  }, []);

  return { items, loading, refresh, addItem, addItems, toggleItem, removeItem };
}
