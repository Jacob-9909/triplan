"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PencilLine } from "lucide-react";
import type { MapPoint, RouteLeg } from "@/lib/types";
import { getCategoryMeta, METHOD_META } from "./meta";

export interface RouteTimelineProps {
  /** visit_order 기준으로 정렬된 해당 Day의 포인트 목록 (순서 변경 시 부모에서 갱신) */
  points: MapPoint[];
  /** 해당 Day에 속한 이동 구간 목록 */
  legs: RouteLeg[];
  /** 구간을 눌렀을 때 (이동수단·시간·비용 편집). 없으면 읽기 전용 */
  onLegClick?: (leg: RouteLeg) => void;
  /** 장소 카드를 눌렀을 때 (사진·링크·메모 상세) */
  onPointClick?: (point: MapPoint) => void;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

export default function RouteTimeline({ points, legs, onLegClick, onPointClick }: RouteTimelineProps) {
  // 인접 포인트 사이 구간 매칭: from_point_id === 이전 포인트 && to_point_id === 다음 포인트
  const legBetween = useMemo(() => {
    const map = new Map<string, RouteLeg>();
    for (const leg of legs) map.set(`${leg.from_point_id}->${leg.to_point_id}`, leg);
    return map;
  }, [legs]);

  if (points.length === 0) {
    return (
      <div className="card px-4 py-8 text-center text-sm text-foreground/50">
        타임라인이 비어 있습니다. 일정을 추가해보세요.
      </div>
    );
  }

  return (
    <div className="relative pl-1">
      {points.map((point, i) => {
        const meta = getCategoryMeta(point.category);
        const Icon = meta.icon;
        const leg = i < points.length - 1 ? legBetween.get(`${point.id}->${points[i + 1].id}`) : undefined;

        return (
          <div key={point.id}>
            {/* 포인트 노드 */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="flex items-center gap-3 py-2 md:gap-4 md:py-2.5"
            >
              <span
                className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-surface shadow-sm md:h-11 md:w-11 ${meta.bg}`}
                aria-hidden
              >
                <Icon size={17} className={meta.color} />
              </span>
              <button
                type="button"
                onClick={() => onPointClick?.(point)}
                disabled={!onPointClick}
                className="card flex min-w-0 flex-1 items-center gap-2 px-3.5 py-2.5 text-left transition enabled:hover:border-primary md:px-4"
              >
                <span className="shrink-0 rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold text-primary-strong">
                  {i + 1}
                </span>
                <p className="truncate text-sm font-semibold">{point.name}</p>
                <span className="ml-auto shrink-0 text-[11px] text-foreground/40">{meta.label}</span>
              </button>
            </motion.div>

            {/* 이동 구간 */}
            {leg && (
              <AnimatePresence mode="popLayout">
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.22 }}
                  className="ml-[19px] flex items-center"
                >
                  <span className="h-8 w-px border-l-2 border-dashed border-border-subtle" aria-hidden />
                  {(() => {
                    const mMeta = METHOD_META[leg.method];
                    const MIcon = mMeta.icon;
                    return (
                      <button
                        type="button"
                        onClick={() => onLegClick?.(leg)}
                        disabled={!onLegClick}
                        className="ml-4 inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-foreground/70 transition enabled:hover:bg-primary-soft enabled:hover:text-primary-strong"
                      >
                        <MIcon size={12} className="text-primary-strong" />
                        {mMeta.label}
                        {leg.duration_min != null && (
                          <span className="rounded-full bg-primary-soft px-1.5 py-px text-[10px] font-semibold text-primary-strong">
                            {formatDuration(leg.duration_min)}
                          </span>
                        )}
                        {leg.cost != null && leg.cost > 0 && (
                          <span className="text-[10px] text-foreground/50">· {leg.cost.toLocaleString()}원</span>
                        )}
                        {onLegClick && <PencilLine size={11} className="text-foreground/35" />}
                      </button>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        );
      })}
    </div>
  );
}
