"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Hourglass, Inbox, MapPin, PencilLine, Route, Undo2, X } from "lucide-react";
import type { MapPoint, RouteLeg } from "@/lib/types";
import { categoryStyle, pointColor, PointBadge } from "@/features/map/pointStyle";
import { usePrefs } from "@/i18n/I18nProvider";
import { METHOD_META } from "./meta";
import { buildSchedule, DEFAULT_STAY, formatDuration, formatTime, type StopTime } from "./schedule";

export interface DayPlanProps {
  /** visit_order 순서로 정렬된 그날 장소 */
  points: MapPoint[];
  /** 그날 이웃한 장소 사이 구간 */
  legs: RouteLeg[];
  /** 후보함: 순서·시간·구간 없이 모아 두는 목록 */
  bin?: boolean;
  /** 편집 콜백. 없으면 읽기 전용 */
  onReorder?: (ids: string[]) => void;
  onDelete?: (id: string) => void;
  onLegClick?: (leg: RouteLeg) => void;
  /** 동선 정리. 순서가 바뀌었으면 true */
  onOptimize?: () => boolean;
  /** 정리 직후 되돌리기 */
  onUndo?: () => void;
  onOpen: (point: MapPoint) => void;
}

/**
 * 하루 일정 한 장: 머리(요약·동선 정리) + 장소 카드와 그 사이 이동 구간.
 * 카드를 누르면 상세, 손잡이를 끌면 순서 변경(키보드도 됨).
 */
export default function DayPlan({ points, legs, bin = false, onReorder, onDelete, onLegClick, onOptimize, onUndo, onOpen }: DayPlanProps) {
  const { t, locale, money } = usePrefs();
  const schedule = useMemo(() => buildSchedule(points, legs), [points, legs]);
  const legAfter = useMemo(() => new Map(legs.map((l) => [l.from_point_id, l])), [legs]);
  const [order, setOrder] = useState<string[] | null>(null);
  const [already, setAlready] = useState(false);
  // 손잡이를 놓을 때 따라오는 click 으로 상세가 열리지 않게
  const lastDrag = useRef(0);

  const shown = order ? order.map((id) => points.find((p) => p.id === id)!).filter(Boolean) : points;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function dragEnd({ active, over }: DragEndEvent) {
    const ids = points.map((p) => p.id);
    // 끄는 동안 미리 옮겨 둔 순서가 최종 순서다 (놓는 순간엔 over 가 자기 자신이라 그것만 보면 안 된다)
    let next = order ?? ids;
    if (over && active.id !== over.id) next = arrayMove(next, next.indexOf(String(active.id)), next.indexOf(String(over.id)));
    setOrder(null);
    lastDrag.current = Date.now();
    if (next.join() !== ids.join()) onReorder?.(next);
  }

  const travelMin = legs.reduce((s, l) => s + (l.duration_min ?? 0), 0);
  const travelCost = legs.reduce((s, l) => s + (l.cost ?? 0), 0);
  const first = points[0] && schedule.get(points[0].id);
  const last = points.length > 0 ? schedule.get(points[points.length - 1].id) : undefined;
  const summary = [
    t("{n}곳", { n: points.length }),
    !bin && travelMin > 0 && t("이동 {time}", { time: formatDuration(travelMin, locale) }),
    !bin && travelCost > 0 && money(travelCost),
  ].filter(Boolean);

  return (
    <section className="card overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-3.5 md:px-5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-base font-bold">
            {bin && <Inbox size={16} aria-hidden />}
            {bin ? t("후보함") : t("일정")}
            {!bin && first && last && (
              <span className="ml-1 text-sm font-semibold tabular-nums text-foreground/68">
                {formatTime(first.arrive)} – {formatTime(last.leave)}
              </span>
            )}
          </h3>
          {points.length > 0 && <p className="mt-0.5 text-xs text-foreground/68">{summary.join(" · ")}</p>}
        </div>
        {onUndo ? (
          <button
            type="button"
            onClick={onUndo}
            className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-strong hover:bg-primary-soft"
          >
            <Undo2 size={14} aria-hidden /> {t("되돌리기")}
          </button>
        ) : (
          !bin &&
          onOptimize &&
          points.length >= 3 && (
            <button
              type="button"
              onClick={() => {
                if (onOptimize()) return;
                setAlready(true);
                setTimeout(() => setAlready(false), 2000);
              }}
              title={t("이동 거리가 짧은 순서로 다시 줄 세워요. 첫 장소는 그대로 둬요")}
              className="flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-strong transition hover:bg-primary hover:text-white"
            >
              <Route size={14} aria-hidden /> {already ? t("이미 가장 짧은 순서예요") : t("동선 정리")}
            </button>
          )
        )}
      </header>

      {points.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
            {bin ? <Inbox size={20} aria-hidden /> : <MapPin size={20} aria-hidden />}
          </span>
          <p className="text-sm font-medium">{bin ? t("후보함이 비어 있어요") : t("이 Day에 추가된 장소가 없어요")}</p>
          <p className="max-w-xs text-xs text-foreground/68">
            {bin
              ? t("어느 날 갈지 아직 모르는 곳을 여기 모아 두고, 장소를 눌러 Day로 옮기세요")
              : t("지도를 누르거나 장소를 검색해 일정을 만들어 보세요")}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={() => setOrder(points.map((p) => p.id))}
          onDragOver={({ active, over }) =>
            over &&
            setOrder((prev) => {
              const base = prev ?? points.map((p) => p.id);
              return arrayMove(base, base.indexOf(String(active.id)), base.indexOf(String(over.id)));
            })
          }
          onDragEnd={dragEnd}
          onDragCancel={() => setOrder(null)}
        >
          <SortableContext items={shown.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ol className="px-3 py-3 md:px-4">
              {shown.map((point, i) => {
                const leg = !bin && !order && i < shown.length - 1 ? legAfter.get(point.id) : undefined;
                return (
                  <Stop
                    key={point.id}
                    point={point}
                    index={i}
                    time={bin ? undefined : schedule.get(point.id)}
                    // 끄는 동안에는 구간이 어긋나므로 숨긴다
                    leg={leg && leg.to_point_id === shown[i + 1].id ? leg : undefined}
                    sortable={!!onReorder}
                    onOpen={() => Date.now() - lastDrag.current > 300 && onOpen(point)}
                    onDelete={onDelete}
                    onLegClick={onLegClick}
                  />
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {onReorder && points.length > 0 && !bin && (
        <p className="border-t border-border-subtle px-4 py-2.5 text-[11px] text-foreground/68 md:px-5">
          {t("손잡이를 끌어 순서를 바꾸고, 구간을 누르면 이동수단·시간·비용을 바꿔요.")}
        </p>
      )}
    </section>
  );
}

function Stop({
  point,
  index,
  time,
  leg,
  sortable,
  onOpen,
  onDelete,
  onLegClick,
}: {
  point: MapPoint;
  index: number;
  time?: StopTime;
  leg?: RouteLeg;
  sortable: boolean;
  onOpen: () => void;
  onDelete?: (id: string) => void;
  onLegClick?: (leg: RouteLeg) => void;
}) {
  const { t, locale, money } = usePrefs();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: point.id,
    disabled: !sortable,
  });
  const [confirming, setConfirming] = useState(false);
  const color = pointColor(point);
  const stay = point.stay_min ?? DEFAULT_STAY;

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "relative z-10" : ""}>
      <div className="flex items-stretch gap-2.5">
        {time && (
          <div className="w-11 shrink-0 pt-2.5 text-right tabular-nums">
            <p className={`text-sm font-bold ${time.fixed ? "text-primary-strong" : ""}`}>{formatTime(time.arrive)}</p>
            <p className="text-[11px] text-foreground/68">{formatTime(time.leave)}</p>
          </div>
        )}
        <div
          className={`group flex min-w-0 flex-1 items-center gap-1 rounded-2xl border bg-surface pr-1 transition ${
            isDragging ? "border-primary shadow-lift" : "border-border-subtle hover:border-primary/50"
          }`}
          style={{ borderLeft: `4px solid ${color}` }}
        >
          <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2.5 text-left">
            <PointBadge point={point} size={34} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                <span className="mr-1 text-xs text-foreground/68">{index + 1}</span>
                {point.name}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-foreground/68">
                <span style={{ color }}>{t(categoryStyle(point.category).label)}</span>
                {time && (
                  <span className="inline-flex items-center gap-0.5">
                    <Hourglass size={10} aria-hidden /> {t("{time} 머묾", { time: formatDuration(stay, locale) })}
                  </span>
                )}
                {time && time.wait > 0 && <span className="text-mint">{t("대기 {time}", { time: formatDuration(time.wait, locale) })}</span>}
                {time && time.late > 0 && (
                  <span className="text-accent">{t("지정 시각보다 {time} 늦음", { time: formatDuration(time.late, locale) })}</span>
                )}
              </span>
            </span>
          </button>
          {onDelete &&
            (confirming ? (
              <button
                type="button"
                onClick={() => onDelete(point.id)}
                className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-white"
              >
                {t("삭제")}
              </button>
            ) : (
              <button
                type="button"
                aria-label={t("{name} 삭제", { name: point.name })}
                onClick={() => {
                  // 실수로 지우지 않게 한 번 더 눌러야 삭제
                  setConfirming(true);
                  setTimeout(() => setConfirming(false), 2500);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/50 transition hover:bg-accent-soft hover:text-accent"
              >
                <X size={14} aria-hidden />
              </button>
            ))}
          {sortable && (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={t("{name} 순서 바꾸기", { name: point.name })}
              className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-foreground/45 hover:bg-surface-muted hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {leg ? (
        <div className="flex items-center gap-2.5 py-1">
          <span className="w-11 shrink-0" />
          <span className="ml-3 h-7 border-l-2 border-dashed border-border-subtle" aria-hidden />
          {(() => {
            const meta = METHOD_META[leg.method];
            const Icon = meta.icon;
            return (
              <button
                type="button"
                onClick={() => onLegClick?.(leg)}
                disabled={!onLegClick}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-foreground/70 transition enabled:hover:bg-primary-soft enabled:hover:text-primary-strong"
              >
                <Icon size={13} className="text-primary-strong" aria-hidden />
                {t(meta.label)}
                <span className="font-bold text-foreground">
                  {leg.duration_min != null ? formatDuration(leg.duration_min, locale) : t("시간 정하기")}
                </span>
                {leg.cost != null && leg.cost > 0 && <span className="text-foreground/68">· {money(leg.cost)}</span>}
                {onLegClick && <PencilLine size={11} className="text-foreground/50" aria-hidden />}
              </button>
            );
          })()}
        </div>
      ) : (
        <div className="h-2" />
      )}
    </li>
  );
}
