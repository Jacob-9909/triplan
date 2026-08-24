"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { TravelDoc } from "@/lib/types";

export type TravelDocInput = Omit<
  TravelDoc,
  "id" | "trip_id" | "file_path"
> & {
  file_path?: string | null;
};

export function useTravelDocs(tripId: string) {
  const [docs, setDocs] = useState<TravelDoc[]>([]);
  const [loading, setLoading] = useState(true);

  /** 서버에서 목록 조회 (setState는 onDone 콜백에서 수행) */
  const fetchAll = useCallback(
    async (onDone: (data: TravelDoc[]) => void) => {
      if (!tripId) {
        onDone([]);
        return;
      }
      try {
        const data = await apiGet<TravelDoc[]>(`/api/travel-docs?trip_id=${tripId}`);
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
      setDocs(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchAll]);

  /** 새로고침 (명시적 호출용) */
  const refresh = useCallback(async () => {
    await fetchAll((data) => setDocs(data));
  }, [fetchAll]);

  const addDoc = useCallback(
    async (input: TravelDocInput) => {
      if (!tripId) return;
      try {
        const data = await apiPost<TravelDoc>("/api/travel-docs", { ...input, trip_id: tripId });
        setDocs((prev) => [...prev, data]);
      } catch {}
    },
    [tripId],
  );

  const removeDoc = useCallback(async (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    try {
      await apiDelete(`/api/travel-docs/${id}`);
    } catch {}
  }, []);

  return { docs, loading, refresh, addDoc, removeDoc };
}
