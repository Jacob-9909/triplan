"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { apiGet, apiPatch } from "@/lib/api";
import type { WishlistPlace } from "@/lib/types";
import { findSelection, type DestinationSelection } from "@/data/world";
import DestinationSelector from "./DestinationSelector";
import TripCreateForm from "./TripCreateForm";

export default function NewTrip({ wishId }: { wishId: string | null }) {
  const router = useRouter();
  const [selection, setSelection] = useState<DestinationSelection | null>(null);
  const [loadingWish, setLoadingWish] = useState(Boolean(wishId));

  // 가고 싶은 곳에서 넘어온 경우 목적지를 미리 채운다
  useEffect(() => {
    if (!wishId) return;
    apiGet<WishlistPlace[]>("/api/wishlist")
      .then((list) => {
        const w = list.find((x) => x.id === wishId);
        if (w) setSelection(findSelection(w.country, w.region));
      })
      .finally(() => setLoadingWish(false));
  }, [wishId]);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6">
      <AnimatePresence mode="wait">
        {loadingWish ? (
          <div key="loading" className="skeleton mx-auto mt-10 h-96 max-w-xl rounded-[var(--radius-card)]" />
        ) : selection === null ? (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -24 }}>
            <h1 className="mb-1 mt-4 text-2xl font-extrabold tracking-tight md:mt-10 md:text-3xl">어디로 떠나 볼까요?</h1>
            <p className="mb-6 text-sm text-foreground/55">대륙 → 나라 → 도시 순서로 고르거나 바로 검색하세요.</p>
            <DestinationSelector onComplete={setSelection} />
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="pt-4 md:pt-10">
            <TripCreateForm
              selection={selection}
              onCancel={() => setSelection(null)}
              onSuccess={async (trip) => {
                if (wishId) await apiPatch(`/api/wishlist/${wishId}`, { trip_id: trip.id }).catch(() => null);
                router.push(`/trips/${trip.id}`);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
