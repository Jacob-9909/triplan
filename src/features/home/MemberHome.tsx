"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { Trip } from "@/lib/types";
import TripCard from "@/features/trip/TripCard";

/** 체험 회원 홈: 관리자가 공개한 여행만 보기 전용으로 */
export default function MemberHome({ username }: { username: string }) {
  const [trips, setTrips] = useState<Trip[] | null>(null);

  useEffect(() => {
    apiGet<Trip[]>("/api/trips").then(setTrips).catch(() => setTrips([]));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{username}님, 둘러보세요</h1>
      <p className="mt-1 text-sm text-foreground/65">체험 계정은 미리 만들어 둔 여행을 보기 전용으로 볼 수 있어요.</p>
      {trips?.length === 0 && <p className="mt-8 text-sm text-foreground/68">아직 공개된 여행이 없어요.</p>}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        {trips?.map((t, i) => (
          <TripCard key={t.id} trip={t} index={i} href={`/demo/${t.id}`} />
        ))}
      </div>
    </div>
  );
}
