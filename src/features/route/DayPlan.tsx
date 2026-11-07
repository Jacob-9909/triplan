"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
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
import { AlertTriangle, BedDouble, GripVertical, Hourglass, Inbox, LayoutGrid, MapPin, MessageCircle, Route, Sparkles, ThumbsUp, Undo2, X } from "lucide-react";
import type { MapPoint, RouteLeg } from "@/lib/types";
import type { StayAnchor } from "@/features/trip/itinerary";
import { categoryStyle, pointColor, PointBadge } from "@/features/map/pointStyle";
import { usePrefs, useT } from "@/i18n/I18nProvider";
import { buildSchedule, DEFAULT_STAY, formatDuration, formatTime, type StopTime } from "./schedule";
import { formatRanges, hoursOn, osmWeekday, parseOpeningHours, visitProblem } from "./openingHours";
import { photoUrl } from "@/lib/api";

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
  /** 장소 사이 구간 카드 (이동수단 비교·길찾기) */
  renderLeg: (leg: RouteLeg, from: MapPoint, to: MapPoint) => ReactNode;
  /** 동선 정리. 순서가 바뀌었으면 true */
  onOptimize?: () => boolean;
  /** 이 Day 에 넣은 구역 이름과, 지우기 (편집 권한만) */
  area?: string | null;
  onClearArea?: () => void;
  /** 후보함을 걸어서 다닐 만한 구역으로 묶어 보기 */
  onGroup?: () => void;
  /** 후보함에 AI 추천 장소 받기 */
  onSuggest?: () => void;
  /** 정리 직후 되돌리기 */
  onUndo?: () => void;
  onOpen: (point: MapPoint) => void;
  /** 출발 숙소(전날 밤)와 돌아갈 숙소(오늘 밤). leg 는 첫·마지막 장소와 잇는 구간 */
  start?: StayAnchor | null;
  end?: StayAnchor | null;
  /** 오늘 밤 숙소 정하기·바꾸기 (편집 권한이 있고 밤이 있는 Day 만) */
  onPickStay?: () => void;
  /** 그날 날짜 "yyyy-MM-dd": 영업시간과 비교해 쉬는 날·영업시간 밖 경고 */
  date?: string | null;
  /** 장소별 동행 의견 수 (가고 싶어요·댓글) */
  social?: Record<string, { voters: string[]; comments: unknown[] }>;
}

/**
 * 하루 일정 한 장: 머리(요약·동선 정리) + 장소 카드와 그 사이 이동 구간.
 * 카드를 누르면 상세, 손잡이를 끌면 순서 변경(키보드도 됨).
 */
export default function DayPlan({
  points,
  legs,
  bin = false,
  onReorder,
  onDelete,
  renderLeg,
  onOptimize,
  onGroup,
  onSuggest,
  onUndo,
  onOpen,
  area,
  onClearArea,
  start = null,
  end = null,
  onPickStay,
  date = null,
  social,
}: DayPlanProps) {
  const { t, locale, money } = usePrefs();
  const weekday = date ? osmWeekday(new Date(`${date}T00:00:00`).getDay()) : null;
  const startTravel = start?.leg?.duration_min ?? 0;
  const endTravel = end?.leg?.duration_min ?? 0;
  const schedule = useMemo(() => buildSchedule(points, legs, startTravel), [points, legs, startTravel]);
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

  const anchorLegs = [start?.leg, end?.leg].filter((l): l is RouteLeg => !!l);
  const travelMin = [...legs, ...anchorLegs].reduce((s, l) => s + (l.duration_min ?? 0), 0);
  const travelCost = [...legs, ...anchorLegs].reduce((s, l) => s + (l.cost ?? 0), 0);
  const firstStop = points[0] && schedule.get(points[0].id);
  const lastStop = points.length > 0 ? schedule.get(points[points.length - 1].id) : undefined;
  // 숙소가 있으면 하루는 숙소를 나설 때 시작해 숙소에 들어갈 때 끝난다
  const startLeave = firstStop ? firstStop.arrive - startTravel : null;
  const endArrive = lastStop ? lastStop.leave + endTravel : null;
  const first = firstStop && { arrive: start ? startLeave! : firstStop.arrive };
  const last = lastStop && { leave: end ? endArrive! : lastStop.leave };
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
          {!bin && area && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary-strong">
              {area}
              {onClearArea && (
                <button type="button" onClick={onClearArea} aria-label={t("구역 이름 지우기")} className="rounded-full hover:text-accent">
                  <X size={12} aria-hidden />
                </button>
              )}
            </span>
          )}
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
        {bin && onSuggest && (
          <button
            type="button"
            onClick={onSuggest}
            className="flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
          >
            <Sparkles size={14} aria-hidden /> {t("AI 추천")}
          </button>
        )}
        {bin && onGroup && points.length >= 3 && (
          <button
            type="button"
            onClick={onGroup}
            className="flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-strong transition hover:bg-primary hover:text-white"
          >
            <LayoutGrid size={14} aria-hidden /> {t("구역으로 묶기")}
          </button>
        )}
      </header>

      {!bin && start && (
        <div className="px-3 pt-3 md:px-4">
          <StayRow point={start.point} time={startLeave} label={t("숙소에서 출발")} onOpen={() => onOpen(start.point)} />
          {start.leg && points[0] && !order && <LegRow>{renderLeg(start.leg, start.point, points[0])}</LegRow>}
        </div>
      )}

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
                    weekday={bin ? null : weekday}
                    votes={social?.[point.id]?.voters.length ?? 0}
                    comments={social?.[point.id]?.comments.length ?? 0}
                    // 끄는 동안에는 구간이 어긋나므로 숨긴다
                    legView={leg && leg.to_point_id === shown[i + 1].id ? renderLeg(leg, point, shown[i + 1]) : undefined}
                    sortable={!!onReorder}
                    onOpen={() => Date.now() - lastDrag.current > 300 && onOpen(point)}
                    onDelete={onDelete}
                  />
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {!bin && end && (
        <div className="px-3 pb-3 md:px-4">
          {end.leg && points.length > 0 && !order && <LegRow>{renderLeg(end.leg, points[points.length - 1], end.point)}</LegRow>}
          <StayRow point={end.point} time={endArrive} label={t("오늘 밤 숙소")} onOpen={() => onOpen(end.point)} onChange={onPickStay} />
        </div>
      )}
      {!bin && !end && onPickStay && (
        <div className="px-3 pb-3 md:px-4">
          <button
            type="button"
            onClick={onPickStay}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border-subtle py-3 text-xs font-semibold text-foreground/68 transition hover:border-primary hover:text-primary-strong"
          >
            <BedDouble size={15} aria-hidden /> {t("오늘 밤 숙소 정하기")}
          </button>
        </div>
      )}

      {onReorder && points.length > 0 && !bin && (
        <p className="border-t border-border-subtle px-4 py-2.5 text-[11px] text-foreground/68 md:px-5">
          {t("손잡이를 끌어 순서를 바꾸고, 구간을 누르면 이동수단을 비교하고 바꿔요.")}
        </p>
      )}
    </section>
  );
}

/** 목록 썸네일: 처음 올린 사진, 없으면 위키백과 사진, 둘 다 없거나 못 불러오면 분류 아이콘 */
function PointThumb({ point }: { point: MapPoint }) {
  const src = point.cover_photo_id ? photoUrl(point.cover_photo_id) : point.image_url;
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return <PointBadge point={point} size={34} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 권한 검사 API·위키미디어 이미지
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(src)}
      className="h-[34px] w-[34px] shrink-0 rounded-xl bg-surface-muted object-cover"
      style={{ outline: `2px solid ${pointColor(point)}`, outlineOffset: -2 }}
    />
  );
}

/** 장소 사이 구간 자리 (시각 칸만큼 비우고 점선 세로줄) */
function LegRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-1">
      <span className="w-11 shrink-0" />
      <span className="ml-3 min-h-9 self-stretch border-l-2 border-dashed border-border-subtle" aria-hidden />
      {children}
    </div>
  );
}

/** 숙소 행: 끌거나 지울 수 없고, 바꾸기는 숙소 고르기로 */
function StayRow({
  point,
  time,
  label,
  onOpen,
  onChange,
}: {
  point: MapPoint;
  time: number | null;
  label: string;
  onOpen: () => void;
  onChange?: () => void;
}) {
  const t = useT();
  return (
    <div className="flex items-stretch gap-2.5">
      <div className="w-11 shrink-0 pt-2.5 text-right text-sm font-bold tabular-nums">{time != null && formatTime(time)}</div>
      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-2xl border border-dashed border-border-subtle bg-surface-muted/60 pr-1">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2.5 text-left">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl bg-ink text-white">
            <BedDouble size={17} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold text-foreground/68">{label}</span>
            <span className="block truncate text-sm font-semibold">{point.name}</span>
          </span>
        </button>
        {onChange && (
          <button
            type="button"
            onClick={onChange}
            className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-primary-strong hover:bg-primary-soft"
          >
            {t("바꾸기")}
          </button>
        )}
      </div>
    </div>
  );
}

function Stop({
  point,
  index,
  time,
  weekday,
  votes,
  comments,
  legView,
  sortable,
  onOpen,
  onDelete,
}: {
  point: MapPoint;
  index: number;
  time?: StopTime;
  /** 가는 날 요일 (0=월). 영업시간 경고용 */
  weekday: number | null;
  votes: number;
  comments: number;
  /** 다음 장소로 가는 구간 카드 */
  legView?: ReactNode;
  sortable: boolean;
  onOpen: () => void;
  onDelete?: (id: string) => void;
}) {
  const { t, locale } = usePrefs();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: point.id,
    disabled: !sortable,
  });
  const [confirming, setConfirming] = useState(false);
  const color = pointColor(point);
  const stay = point.stay_min ?? DEFAULT_STAY;
  // 머무는 동안 문을 닫았거나 쉬는 날이면 알려 준다 (영업시간을 읽을 수 있을 때만)
  const rules = useMemo(() => parseOpeningHours(point.opening_hours), [point.opening_hours]);
  const problem = rules && time && weekday !== null ? visitProblem(rules, weekday, time.arrive, time.leave) : null;
  const hoursWarning =
    problem === "closed"
      ? t("쉬는 날일 수 있어요")
      : problem === "outside"
        ? t("영업시간 {hours} 밖", { hours: formatRanges(hoursOn(rules!, weekday!) ?? []) })
        : null;

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
            <PointThumb point={point} />
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
                {votes > 0 && (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-primary-strong" aria-label={t("가고 싶어요 {n}", { n: votes })}>
                    <ThumbsUp size={10} aria-hidden /> {votes}
                  </span>
                )}
                {comments > 0 && (
                  <span className="inline-flex items-center gap-0.5" aria-label={t("댓글 {n}개", { n: comments })}>
                    <MessageCircle size={10} aria-hidden /> {comments}
                  </span>
                )}
                {hoursWarning && (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-accent">
                    <AlertTriangle size={10} aria-hidden /> {hoursWarning}
                  </span>
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

      {legView ? <LegRow>{legView}</LegRow> : <div className="h-2" />}
    </li>
  );
}
