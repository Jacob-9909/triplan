"use client";

import { useMemo } from "react";
import { Clock3, Coins } from "lucide-react";
import type { MapPoint, RouteLeg } from "@/lib/types";

export interface DaySummaryProps {
  /** 해당 Day의 포인트 목록 */
  points: MapPoint[];
  /** 해당 Day의 이동 구간 목록 */
  legs: RouteLeg[];
}

function formatDuration(min: number): string {
  if (min <= 0) return "-";
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

/**
 * 그날 요약 카드 — legs의 duration_min / cost 합계를 표시.
 */
export default function DaySummary({ points, legs }: DaySummaryProps) {
  const summary = useMemo(
    () => ({
      totalMin: legs.reduce((sum, leg) => sum + (leg.duration_min ?? 0), 0),
      totalCost: legs.reduce((sum, leg) => sum + (leg.cost ?? 0), 0),
    }),
    [legs]
  );

  return (
    <div className="card flex items-stretch divide-x divide-border-subtle p-0">
      <div className="flex flex-1 items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft" aria-hidden>
          <Clock3 size={18} className="text-primary-strong" />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/68">총 이동시간</p>
          <p className="text-lg font-bold leading-tight">{formatDuration(summary.totalMin)}</p>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sand/20" aria-hidden>
          <Coins size={18} className="text-sand" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/68">총 이동비용</p>
          <p className="truncate text-lg font-bold leading-tight">
            {summary.totalCost > 0 ? `${summary.totalCost.toLocaleString()}원` : "-"}
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-2 px-4 sm:flex">
        <span className="rounded-full bg-teal-soft px-2.5 py-1 text-xs font-semibold text-mint">
          {points.length}곳 방문
        </span>
      </div>
    </div>
  );
}
