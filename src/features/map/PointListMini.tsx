"use client";

import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import type { MapPoint } from "@/lib/types";
import { getCategoryColor, getCategoryLabel } from "./categories";

export interface PointListMiniProps {
  points: MapPoint[];
  selectedPointId?: string | null;
  /** 항목 클릭 시 호출 — 상위에서 지도 flyTo 처리 */
  onSelect?: (id: string) => void;
}

/**
 * 지도 옆 사이드바용 포인트 리스트.
 */
export default function PointListMini({ points, selectedPointId = null, onSelect }: PointListMiniProps) {
  if (points.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 p-6 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft" aria-hidden>
          <MapPin size={18} className="text-primary-strong" />
        </span>
        <p className="text-sm font-semibold text-foreground/70">아직 포인트가 없어요</p>
        <p className="text-xs text-foreground/68">지도를 클릭해 첫 장소를 추가해보세요</p>
      </div>
    );
  }

  return (
    <ul className="card flex flex-col divide-y divide-border-subtle overflow-hidden p-0">
      {points.map((point, i) => {
        const selected = point.id === selectedPointId;
        const color = getCategoryColor(point.category);
        return (
          <li key={point.id}>
            <motion.button
              type="button"
              onClick={() => onSelect?.(point.id)}
              whileTap={{ scale: 0.98 }}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                selected ? "bg-primary-soft" : "hover:bg-primary-soft/50"
              }`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: color }}
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{point.name}</span>
                <span className="block truncate text-xs text-foreground/68">
                  {point.memo ?? `${point.day_number ? `Day ${point.day_number} · ` : ""}${getCategoryLabel(point.category)}`}
                </span>
              </span>
              <span
                className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{ borderColor: color, color }}
              >
                {getCategoryLabel(point.category)}
              </span>
            </motion.button>
          </li>
        );
      })}
    </ul>
  );
}
