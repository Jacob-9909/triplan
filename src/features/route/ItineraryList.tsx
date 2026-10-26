"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, MapPin, Trash2 } from "lucide-react";
import type { MapPoint } from "@/lib/types";
import { PointBadge } from "@/features/map/pointStyle";

export interface ItineraryListProps {
  /** visit_order 기준으로 정렬된 해당 Day의 포인트 목록 */
  points: MapPoint[];
  /** 드래그앤드롭으로 순서가 확정되었을 때 호출 (새로운 id 순서 배열) */
  onReorder: (newOrderedIds: string[]) => void;
  /** 포인트 삭제 */
  onDelete?: (id: string) => void;
  /** 삭제 중인 id 집합 (낙관적 UI 용, optional) */
  deletingIds?: ReadonlySet<string>;
}

interface SortableItemProps {
  point: MapPoint;
  index: number;
  total: number;
  onMove: (id: string, delta: -1 | 1) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

function SortablePointItem({ point, index, total, onMove, onDelete, isDeleting }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: point.id,
  });

  const arrow =
    "flex h-7 w-8 items-center justify-center rounded-lg text-foreground/70 transition hover:bg-primary-soft hover:text-primary-strong disabled:pointer-events-none disabled:opacity-25";

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-center gap-2.5 rounded-2xl border p-2.5 transition-shadow md:p-3 ${
        isDragging
          ? "relative z-10 border-primary bg-primary-soft shadow-lg"
          : "border-border-subtle bg-surface shadow-sm hover:shadow-md"
      } ${isDeleting ? "opacity-40" : ""}`}
    >
      {/* 순서 바꾸기: 위·아래 화살표 */}
      <div className="flex shrink-0 flex-col">
        <button type="button" aria-label={`${point.name} 위로`} disabled={index === 0} onClick={() => onMove(point.id, -1)} className={arrow}>
          <ChevronUp size={18} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          aria-label={`${point.name} 아래로`}
          disabled={index === total - 1}
          onClick={() => onMove(point.id, 1)}
          className={arrow}
        >
          <ChevronDown size={18} strokeWidth={2.5} />
        </button>
      </div>

      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-white">
        {index + 1}
      </span>
      <PointBadge point={point} size={34} />

      {/* 이름 영역을 끌어서도 옮길 수 있다 */}
      <div className="min-w-0 flex-1 cursor-grab touch-pan-y active:cursor-grabbing" {...attributes} {...listeners}>
        <p className="truncate text-sm font-semibold text-foreground">{point.name}</p>
        {point.memo && <p className="mt-0.5 truncate text-xs text-foreground/65">{point.memo}</p>}
      </div>

      {onDelete && (
        <button
          type="button"
          aria-label={`${point.name} 삭제`}
          onClick={() => onDelete(point.id)}
          className="rounded-lg p-2 text-foreground/65 transition-colors hover:bg-accent-soft hover:text-accent"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

export default function ItineraryList({ points, onReorder, onDelete, deletingIds }: ItineraryListProps) {
  // 로컬 순서 — 드래그 중 즉시 반영, 확정 시 onReorder 호출
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const orderedPoints = useMemo(() => {
    if (!localOrder) return points;
    const byId = new Map(points.map((p) => [p.id, p]));
    const reordered = localOrder.map((id) => byId.get(id)).filter((p): p is MapPoint => Boolean(p));
    const appended = points.filter((p) => !localOrder.includes(p.id));
    return [...reordered, ...appended];
  }, [points, localOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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
    if (finalOrder.join(",") !== points.map((p) => p.id).join(",")) onReorder(finalOrder);
  }

  /** 화살표로 한 칸씩 이동 */
  function handleMove(id: string, delta: -1 | 1) {
    const ids = points.map((p) => p.id);
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= ids.length) return;
    onReorder(arrayMove(ids, from, to));
  }

  function handleDragStart() {
    // 드래그 시작 시 현재 prop 순서를 로컬 상태에 두어 시각적 일관성 유지
    setLocalOrder(points.map((p) => p.id));
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
      <div className="card flex flex-col items-center gap-2 px-4 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
          <MapPin size={20} />
        </span>
        <p className="text-sm font-medium">이 Day에 추가된 장소가 없습니다</p>
        <p className="text-xs text-foreground/62">지도에서 장소를 추가해 일정을 만들어보세요</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOverPreview}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setLocalOrder(null)}
    >
      <SortableContext items={orderedPoints.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {orderedPoints.map((point, i) => (
            <li key={point.id}>
              <SortablePointItem
                point={point}
                index={i}
                total={orderedPoints.length}
                onMove={handleMove}
                onDelete={onDelete}
                isDeleting={deletingIds?.has(point.id)}
              />
            </li>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
