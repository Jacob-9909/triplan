"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Hourglass, PencilLine } from "lucide-react";
import type { MapPoint, RouteLeg } from "@/lib/types";
import { categoryStyle, pointColor, PointBadge } from "@/features/map/pointStyle";
import { METHOD_META } from "./meta";
import { buildSchedule, DEFAULT_STAY, formatDuration, formatTime } from "./schedule";

export interface RouteTimelineProps {
  /** visit_order 기준으로 정렬된 해당 Day의 포인트 목록 (순서 변경 시 부모에서 갱신) */
  points: MapPoint[];
  /** 해당 Day에 속한 이동 구간 목록 */
  legs: RouteLeg[];
  /** 구간을 눌렀을 때 (이동수단·시간·비용 편집). 없으면 읽기 전용 */
  onLegClick?: (leg: RouteLeg) => void;
  /** 장소 카드를 눌렀을 때 (사진·링크·메모·시간 상세) */
  onPointClick?: (point: MapPoint) => void;
}

/** 하루 타임테이블: 장소별 도착~출발 시각과 그 사이 이동 구간 */
export default function RouteTimeline({ points, legs, onLegClick, onPointClick }: RouteTimelineProps) {
  const schedule = useMemo(() => buildSchedule(points, legs), [points, legs]);
  const legBetween = useMemo(() => {
    const map = new Map<string, RouteLeg>();
    for (const leg of legs) map.set(`${leg.from_point_id}->${leg.to_point_id}`, leg);
    return map;
  }, [legs]);

  if (points.length === 0) {
    return (
      <div className="card px-4 py-8 text-center text-sm text-foreground/62">
        타임테이블이 비어 있어요. 지도에서 장소를 추가해 보세요.
      </div>
    );
  }

  const first = schedule.get(points[0].id)!;
  const last = schedule.get(points[points.length - 1].id)!;

  return (
    <div className="card p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <Clock size={15} className="text-primary-strong" /> 타임테이블
        </h3>
        <span className="text-xs font-semibold text-foreground/62">
          {formatTime(first.arrive)} 시작 · {formatTime(last.leave)} 마무리
        </span>
      </div>

      {points.map((point, i) => {
        const t = schedule.get(point.id)!;
        const leg = i < points.length - 1 ? legBetween.get(`${point.id}->${points[i + 1].id}`) : undefined;
        const color = pointColor(point);
        const stay = point.stay_min ?? DEFAULT_STAY;

        return (
          <div key={point.id}>
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="flex items-stretch gap-3"
            >
              {/* 시각 */}
              <div className="w-12 shrink-0 pt-2.5 text-right tabular-nums">
                <p className={`text-sm font-bold ${t.fixed ? "text-primary-strong" : ""}`}>{formatTime(t.arrive)}</p>
                <p className="text-[11px] text-foreground/55">{formatTime(t.leave)}</p>
              </div>
              {/* 색 막대 */}
              <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
              {/* 장소 */}
              <button
                type="button"
                onClick={() => onPointClick?.(point)}
                disabled={!onPointClick}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-2.5 text-left transition enabled:hover:border-primary enabled:hover:shadow-sm"
              >
                <PointBadge point={point} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    <span className="mr-1 text-xs text-foreground/55">{i + 1}</span>
                    {point.name}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-foreground/62">
                    <span style={{ color }}>{categoryStyle(point.category).label}</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Hourglass size={10} /> {formatDuration(stay)} 머묾
                    </span>
                    {t.wait > 0 && <span className="text-mint">대기 {formatDuration(t.wait)}</span>}
                    {t.late > 0 && <span className="text-accent">지정 시각보다 {formatDuration(t.late)} 늦음</span>}
                  </p>
                </div>
                {onPointClick && <PencilLine size={13} className="shrink-0 text-foreground/50" />}
              </button>
            </motion.div>

            {/* 이동 구간 */}
            {leg && (
              <AnimatePresence mode="popLayout">
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex items-center gap-3 py-1.5"
                >
                  <span className="w-12 shrink-0" />
                  <span className="flex w-1 shrink-0 justify-center" aria-hidden>
                    <span className="h-7 border-l-2 border-dashed border-border-subtle" />
                  </span>
                  {(() => {
                    const mMeta = METHOD_META[leg.method];
                    const MIcon = mMeta.icon;
                    return (
                      <button
                        type="button"
                        data-leg
                        onClick={() => onLegClick?.(leg)}
                        disabled={!onLegClick}
                        className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground/70 transition enabled:hover:bg-primary-soft enabled:hover:text-primary-strong"
                      >
                        <MIcon size={13} className="text-primary-strong" />
                        {mMeta.label}
                        <span className="font-bold text-primary-strong">
                          {leg.duration_min != null ? formatDuration(leg.duration_min) : "시간 정하기"}
                        </span>
                        {leg.cost != null && leg.cost > 0 && (
                          <span className="text-[11px] text-foreground/62">· {leg.cost.toLocaleString()}원</span>
                        )}
                        {onLegClick && <PencilLine size={11} className="text-foreground/55" />}
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
