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
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight, MapPin, Move, X } from "lucide-react";
import type { MapPoint } from "@/lib/types";
import { categoryStyle, pointColor } from "@/features/map/pointStyle";
import { useT } from "@/i18n/I18nProvider";

export interface ItineraryListProps {
  /** visit_order 기준으로 정렬된 해당 Day의 포인트 목록 */
  points: MapPoint[];
  /** 순서가 확정되었을 때 호출 (새로운 id 순서 배열) */
  onReorder: (newOrderedIds: string[]) => void;
  /** 포인트 삭제 */
  onDelete?: (id: string) => void;
  /** 항목을 눌렀을 때 (장소 상세 열기) */
  onOpen?: (point: MapPoint) => void;
  /** 삭제 중인 id 집합 (낙관적 UI 용, optional) */
  deletingIds?: ReadonlySet<string>;
}

interface ChipProps {
  point: MapPoint;
  index: number;
  onOpen?: (point: MapPoint) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

/** 장소 하나 = 작은 칩. 끌어서 순서를 바꾸고, 누르면 상세가 열린다 */
function PointChip({ point, index, onOpen, onDelete, isDeleting }: ChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: point.id });
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const color = pointColor(point);
  const Icon = categoryStyle(point.category).icon;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative inline-flex max-w-full items-center rounded-full border border-border-subtle bg-surface shadow-sm transition-shadow ${
        isDragging ? "z-10 scale-105 shadow-lift" : "hover:shadow-md"
      } ${isDeleting ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={() => onOpen?.(point)}
        className="flex min-w-0 cursor-grab items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-2.5 outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
        aria-label={t("{n}번 {name} (끌어서 순서 변경, 눌러서 상세)", { n: index + 1, name: point.name })}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {index + 1}
        </span>
        <Icon size={14} className="shrink-0" style={{ color }} />
        <span className="max-w-[9.5rem] truncate text-sm font-semibold text-foreground">{point.name}</span>
      </button>
      {onDelete &&
        (confirming ? (
          <button
            type="button"
            onClick={() => onDelete(point.id)}
            className="mr-1 shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-white"
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
            className="-my-1 mr-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/68 transition hover:bg-accent-soft hover:text-accent"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        ))}
    </div>
  );
}

export default function ItineraryList({ points, onReorder, onDelete, onOpen, deletingIds }: ItineraryListProps) {
  const t = useT();
  // 드래그 중 미리보기 순서
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  // 드래그를 놓을 때 따라오는 click으로 상세가 열리지 않게 잠깐 막는다
  const lastDragEnd = useRef(0);
  const open = (p: MapPoint) => {
    if (Date.now() - lastDragEnd.current > 300) onOpen?.(p);
  };

  const orderedPoints = useMemo(() => {
    if (!localOrder) return points;
    const byId = new Map(points.map((p) => [p.id, p]));
    const reordered = localOrder.map((id) => byId.get(id)).filter((p): p is MapPoint => Boolean(p));
    const appended = points.filter((p) => !localOrder.includes(p.id));
    return [...reordered, ...appended];
  }, [points, localOrder]);

  // 마우스는 조금 움직이면, 터치는 꾹 눌러야 드래그가 시작된다 (탭은 상세 열기, 스크롤은 그대로)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    // 드래그 중 미리보기(onDragOver)로 이미 옮겨 둔 순서가 최종 순서다.
    // 놓는 순간에는 active가 자기 자리 위에 있어 over.id === active.id가 되므로 그것만 보면 안 된다.
    let finalOrder = localOrder ?? points.map((p) => p.id);
    if (over && active.id !== over.id) {
      const from = finalOrder.indexOf(String(active.id));
      const to = finalOrder.indexOf(String(over.id));
      if (from !== -1 && to !== -1) finalOrder = arrayMove(finalOrder, from, to);
    }
    setLocalOrder(null);
    lastDragEnd.current = Date.now();
    if (finalOrder.join(",") !== points.map((p) => p.id).join(",")) onReorder(finalOrder);
  }

  function handleDragOverPreview(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalOrder((prev) => {
      const base = prev ?? points.map((p) => p.id);
      const from = base.indexOf(String(active.id));
      const to = base.indexOf(String(over.id));
      if (from === -1 || to === -1) return base;
      return arrayMove(base, from, to);
    });
  }

  if (points.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-4 py-8 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
          <MapPin size={20} />
        </span>
        <p className="text-sm font-medium">{t("이 Day에 추가된 장소가 없어요")}</p>
        <p className="text-xs text-foreground/68">{t("지도를 누르거나 장소를 검색해 일정을 만들어 보세요")}</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">{t("방문 순서")}</h3>
        <span className="flex items-center gap-1 text-[11px] text-foreground/68">
          <Move size={12} /> {t("끌어서 순서 바꾸기")}
        </span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => setLocalOrder(points.map((p) => p.id))}
        onDragOver={handleDragOverPreview}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setLocalOrder(null)}
      >
        <SortableContext items={orderedPoints.map((p) => p.id)} strategy={rectSortingStrategy}>
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2.5">
            {orderedPoints.map((point, i) => (
              <li key={point.id} className="flex max-w-full items-center gap-1.5">
                {i > 0 && <ArrowRight size={16} strokeWidth={2.5} className="shrink-0 text-foreground/45" aria-hidden />}
                <PointChip
                  point={point}
                  index={i}
                  onOpen={onOpen ? open : undefined}
                  onDelete={onDelete}
                  isDeleting={deletingIds?.has(point.id)}
                />
              </li>
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}
