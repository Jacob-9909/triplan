"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Eye,
  Luggage,
  MapPin,
  MousePointerClick,
  PencilLine,
  Plane,
  Share2,
} from "lucide-react";
import type { Access, MapPoint, RouteLeg } from "@/lib/types";
import { apiPatch, setTripToken } from "@/lib/api";
import { useTripData, persistOrder, addPoint, ensureLeg, deletePoint, updateLeg } from "./useTripData";
import { TripMap, AddPointDialog, type PointDraft } from "@/features/map";
import PlaceSearch, { type PickedPlace } from "@/features/map/PlaceSearch";
import { getCountryCenter } from "@/data/countryCenters";
import DayTabs from "@/features/route/DayTabs";
import ItineraryList from "@/features/route/ItineraryList";
import RouteTimeline from "@/features/route/RouteTimeline";
import DaySummary from "@/features/route/DaySummary";
import LegEditor from "@/features/route/LegEditor";
import { fetchDirections } from "@/features/route/directions";
import Sheet from "@/features/ui/Sheet";
import PlaceDetail from "./PlaceDetail";
import ExpenseForm from "@/features/expenses/ExpenseForm";
import ExpenseList from "@/features/expenses/ExpenseList";
import ExpenseSummary from "@/features/expenses/ExpenseSummary";
import { useExpenses } from "@/features/expenses/useExpenses";
import ChecklistPanel from "@/features/prep/ChecklistPanel";
import DocsPanel from "@/features/prep/DocsPanel";
import CoverPhoto from "@/features/ui/CoverPhoto";
import { ddayLabel, formatRange, stayLabel, tripPhase } from "@/features/ui/dates";
import SharePanel from "./SharePanel";

type Tab = "plan" | "expenses" | "prep";

const TABS: { id: Tab; label: string; icon: typeof MapPin }[] = [
  { id: "plan", label: "일정", icon: MapPin },
  { id: "expenses", label: "가계부", icon: Banknote },
  { id: "prep", label: "준비", icon: Luggage },
];

export default function TripWorkspace({ tripId, mode }: { tripId: string; mode: Access }) {
  // 관리자 화면에서는 이전에 열었던 공유 링크 토큰을 쓰지 않는다
  if (mode === "admin") setTripToken(null);
  const canEdit = mode !== "view";

  const { trip, points, legs, loading, notConfigured, setPoints, setLegs } = useTripData(tripId);
  const { expenses } = useExpenses(tripId);
  const [tab, setTab] = useState<Tab>("plan");
  const [day, setDay] = useState(1);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  /** 지도 POI 라벨이나 검색 결과로 미리 채울 장소 정보 */
  const [poiPrefill, setPoiPrefill] = useState<{ name: string; category: MapPoint["category"] } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const dayPoints = useMemo(
    () =>
      points
        .filter((p) => p.day_number === day)
        .sort((a, b) => (a.visit_order ?? 99) - (b.visit_order ?? 99)),
    [points, day]
  );
  // 지금 순서에서 바로 이웃한 장소 사이의 구간만 쓴다 (순서를 바꾸면 예전 구간은 합계에서 빠진다)
  const dayLegs = useMemo(() => {
    const out: RouteLeg[] = [];
    for (let i = 0; i < dayPoints.length - 1; i++) {
      const leg = legs.find((l) => l.from_point_id === dayPoints[i].id && l.to_point_id === dayPoints[i + 1].id);
      if (leg) out.push(leg);
    }
    return out;
  }, [legs, dayPoints]);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [legEditId, setLegEditId] = useState<string | null>(null);
  const detailPoint = points.find((p) => p.id === detailId) ?? null;
  const editingLeg = legs.find((l) => l.id === legEditId) ?? null;

  // 시간이 비어 있는 구간은 거리 기반 추정치를 자동으로 채운다
  const estimated = useRef(new Set<string>());
  useEffect(() => {
    if (!canEdit) return;
    for (const leg of dayLegs) {
      if (leg.duration_min != null || estimated.current.has(leg.id)) continue;
      const from = points.find((p) => p.id === leg.from_point_id);
      const to = points.find((p) => p.id === leg.to_point_id);
      if (!from || !to) continue;
      estimated.current.add(leg.id);
      void fetchDirections(from, to, leg.method).then((r) => {
        const patch = { duration_min: r.durationMin, distance_km: r.distanceKm };
        setLegs((prev) => prev.map((l) => (l.id === leg.id ? { ...l, ...patch } : l)));
        void updateLeg(leg.id, patch);
      });
    }
  }, [dayLegs, points, canEdit, setLegs]);

  // 구간 수정: 화면은 바로 바꾸고, 저장은 입력이 멈춘 뒤 한 번만
  const legSaveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const legPending = useRef(new Map<string, Partial<RouteLeg>>());
  function changeLeg(id: string, patch: Partial<RouteLeg>) {
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    // 이동수단·시간·비용을 연달아 바꿔도 모두 저장되게 합쳐 둔다
    legPending.current.set(id, { ...legPending.current.get(id), ...patch });
    const timer = legSaveTimers.current.get(id);
    if (timer) clearTimeout(timer);
    legSaveTimers.current.set(
      id,
      setTimeout(() => {
        const merged = legPending.current.get(id);
        legPending.current.delete(id);
        legSaveTimers.current.delete(id);
        if (merged) void updateLeg(id, merged);
      }, 500)
    );
  }

  async function savePoint(id: string, patch: Partial<Pick<MapPoint, "memo" | "link_url">>) {
    try {
      await apiPatch(`/api/map-points/${id}`, patch);
      setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "저장하지 못했어요.";
    }
  }

  async function handleReorder(orderedIds: string[]) {
    setPoints((prev) =>
      prev.map((p) => {
        const idx = orderedIds.indexOf(p.id);
        return idx >= 0 ? { ...p, visit_order: idx + 1 } : p;
      })
    );
    await persistOrder(tripId, orderedIds);
    // 순서가 바뀐 인접 구간의 leg 확보
    const updated: typeof legs = [...legs];
    for (let i = 0; i < orderedIds.length - 1; i++) {
      const leg = await ensureLeg(tripId, orderedIds[i], orderedIds[i + 1]);
      if (leg && !updated.some((l) => l.id === leg.id)) updated.push(leg);
    }
    setLegs(updated);
  }

  async function handlePointCreate(draft: PointDraft) {
    if (!pendingLatLng) return;
    const maxOrder = Math.max(0, ...dayPoints.map((p) => p.visit_order ?? 0));
    const created = await addPoint(tripId, { ...draft, lat: pendingLatLng.lat, lng: pendingLatLng.lng }, day, maxOrder + 1);
    if (created) {
      setPoints((prev) => [...prev, created]);
      const prevPoint = dayPoints[dayPoints.length - 1];
      if (prevPoint) {
        const leg = await ensureLeg(tripId, prevPoint.id, created.id);
        if (leg) setLegs((prev) => [...prev.filter((l) => l.id !== leg.id), leg]);
      }
    }
    setPendingLatLng(null);
    setPoiPrefill(null);
  }

  async function handlePointDelete(id: string) {
    const idx = dayPoints.findIndex((p) => p.id === id);
    if (!(await deletePoint(id))) return;
    setPoints((prev) => prev.filter((p) => p.id !== id));
    setLegs((prev) => prev.filter((l) => l.from_point_id !== id && l.to_point_id !== id));
    // 가운데 장소를 지웠으면 앞뒤 장소를 새 구간으로 잇는다
    const before = dayPoints[idx - 1];
    const after = dayPoints[idx + 1];
    if (before && after) {
      const leg = await ensureLeg(tripId, before.id, after.id);
      if (leg) setLegs((prev) => [...prev.filter((l) => l.id !== leg.id), leg]);
    }
  }

  if (notConfigured) {
    return (
      <div className="mx-auto mt-24 max-w-sm px-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <MapPin size={26} />
        </div>
        <h2 className="mt-4 text-lg font-bold">여행을 열 수 없어요</h2>
        <p className="mt-2 text-sm text-foreground/55">
          삭제되었거나 링크가 바뀌었을 수 있어요. {mode === "admin" ? "" : "링크를 보낸 사람에게 새 링크를 받아 주세요."}
        </p>
        {mode === "admin" && (
          <Link href="/" className="btn btn-ghost mt-5 px-5 py-2.5 text-sm">
            내 여행으로
          </Link>
        )}
      </div>
    );
  }

  if (loading || !trip) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <motion.div
          animate={{ x: [-30, 30], y: [6, -6], rotate: [8, -8] }}
          transition={{ repeat: Infinity, repeatType: "mirror", duration: 1.2, ease: "easeInOut" }}
          className="text-primary"
        >
          <Plane size={40} />
        </motion.div>
      </div>
    );
  }

  const phase = tripPhase(trip);
  const stay = stayLabel(trip);
  const mapCenter =
    dayPoints.length > 0
      ? {
          lat: dayPoints.reduce((s, p) => s + p.lat, 0) / dayPoints.length,
          lng: dayPoints.reduce((s, p) => s + p.lng, 0) / dayPoints.length,
        }
      : getCountryCenter(trip.country);

  return (
    <div className={mode === "admin" ? "" : "min-h-dvh pb-16"}>
      {/* 사진 헤더 */}
      <header className="relative isolate overflow-hidden bg-slate-300 text-white md:mx-auto md:mt-6 md:max-w-6xl md:rounded-[1.75rem]">
        <motion.div
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute inset-0 -z-10"
        >
          <CoverPhoto country={trip.country} continent={trip.continent} />
        </motion.div>
        <div className="flex min-h-56 flex-col justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] md:min-h-72 md:p-8">
          <div className="flex items-center justify-between gap-2">
            {mode === "admin" ? (
              <Link
                href="/"
                aria-label="내 여행으로"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 backdrop-blur-md transition hover:bg-black/40"
              >
                <ArrowLeft size={18} />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                {mode === "edit" ? <PencilLine size={13} /> : <Eye size={13} />}
                {mode === "edit" ? "공유받은 여행 · 함께 편집 중" : "공유받은 여행 · 보기 전용"}
              </span>
            )}
            {mode === "admin" && (
              <button
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-lift transition active:scale-95"
              >
                <Share2 size={15} /> 공유
              </button>
            )}
          </div>
          <div>
            <span
              className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${
                phase.phase === "ongoing" ? "bg-mint text-white" : "bg-white/90 text-foreground"
              }`}
            >
              {ddayLabel(trip)}
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-5xl">{trip.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
              <span>
                <MapPin size={14} className="inline -mt-0.5" /> {[trip.country, trip.region].filter(Boolean).join(" · ")}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={14} />
                {formatRange(trip)}
                {stay && ` · ${stay}`}
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* 탭 */}
      <div className="glass sticky top-0 z-30 border-b border-border-subtle md:top-16 md:border-none md:bg-transparent md:backdrop-blur-none">
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 py-2 md:px-0 md:py-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors md:flex-none md:px-5 ${
                tab === id ? "text-white" : "text-foreground/55 hover:text-foreground"
              }`}
            >
              {tab === id && (
                <motion.span
                  layoutId="trip-tab"
                  className="absolute inset-0 rounded-full bg-foreground"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                />
              )}
              <Icon size={15} className="relative" />
              <span className="relative">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-3 md:px-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {tab === "plan" && (
              <div className="space-y-4">
                <DayTabs trip={trip} value={day} onChange={setDay} />
                <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
                  <div className="space-y-4 lg:col-span-3">
                    <div className="relative overflow-hidden rounded-[var(--radius-card)] shadow-card">
                      {canEdit && (
                        <div className="absolute left-3 right-14 top-3 z-10 sm:right-auto">
                          <PlaceSearch
                            center={mapCenter}
                            onPick={(place: PickedPlace) => {
                              setPendingLatLng({ lat: place.lat, lng: place.lng });
                              setPoiPrefill({ name: place.name, category: place.category });
                            }}
                          />
                        </div>
                      )}
                      <TripMap
                        points={dayPoints}
                        legs={dayLegs}
                        expenses={expenses}
                        defaultCenter={getCountryCenter(trip.country)}
                        selectedPointId={selectedPointId}
                        focusPointId={selectedPointId}
                        onMapClick={
                          canEdit
                            ? (latlng: { lat: number; lng: number }, poi) => {
                                setPendingLatLng(latlng);
                                setPoiPrefill(poi ?? null);
                              }
                            : undefined
                        }
                        onPointClick={(id: string) => setSelectedPointId(id)}
                        onPointOpen={(id: string) => setDetailId(id)}
                        editable={canEdit}
                      />
                    </div>
                    <DaySummary points={dayPoints} legs={dayLegs} />
                  </div>
                  <aside className="space-y-4 lg:col-span-2">
                    {canEdit && (
                      <>
                        <ItineraryList points={dayPoints} onReorder={handleReorder} onDelete={handlePointDelete} />
                        <p className="flex items-center gap-1.5 px-1 text-xs text-foreground/45">
                          <MousePointerClick size={13} /> 지도를 누르거나 장소를 검색해 핀을 꽂고, 끌어서 순서를 바꿔요.
                        </p>
                      </>
                    )}
                    {canEdit && dayLegs.length > 0 && (
                      <p className="px-1 text-xs text-foreground/45">구간(이동수단 표시)을 누르면 이동수단·시간·비용을 바꿀 수 있어요. 장소를 누르면 사진·링크를 붙여요.</p>
                    )}
                    <RouteTimeline
                      points={dayPoints}
                      legs={dayLegs}
                      onLegClick={canEdit ? (leg) => setLegEditId(leg.id) : undefined}
                      onPointClick={(p) => setDetailId(p.id)}
                    />
                  </aside>
                </div>
              </div>
            )}

            {tab === "expenses" && (
              <ExpensesTab tripId={tripId} day={day} canEdit={canEdit} startDate={trip.start_date} endDate={trip.end_date} />
            )}

            {tab === "prep" && (
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
                <ChecklistPanel tripId={tripId} readOnly={!canEdit} />
                <DocsPanel tripId={tripId} readOnly={!canEdit} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {canEdit && (
        <AddPointDialog
          open={pendingLatLng !== null}
          latlng={pendingLatLng}
          prefill={poiPrefill ?? undefined}
          onCancel={() => {
            setPendingLatLng(null);
            setPoiPrefill(null);
          }}
          onSave={handlePointCreate}
        />
      )}

      {mode === "admin" && <SharePanel open={shareOpen} onClose={() => setShareOpen(false)} trip={trip} />}

      <PlaceDetail point={detailPoint} canEdit={canEdit} onClose={() => setDetailId(null)} onSave={savePoint} />

      <Sheet open={editingLeg !== null} onClose={() => setLegEditId(null)} title="이동 구간">
        {editingLeg && (
          <LegSheetBody
            leg={editingLeg}
            points={points}
            onChange={changeLeg}
            onDone={() => setLegEditId(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

function ExpensesTab({
  tripId,
  day,
  canEdit,
  startDate,
  endDate,
}: {
  tripId: string;
  day: number;
  canEdit: boolean;
  startDate: string | null;
  endDate: string | null;
}) {
  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses(tripId);

  if (!canEdit) {
    return <ExpenseSummary expenses={expenses} startDate={startDate} endDate={endDate} />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
      <div className="space-y-4 lg:col-span-2">
        <ExpenseForm
          baseCurrency="KRW"
          onSubmit={async (input) => {
            const saved = await addExpense({ ...input, day_number: day });
            return saved !== null;
          }}
        />
        <p className="px-1 text-xs text-foreground/45">새 지출은 지금 보고 있는 Day {day}에 기록돼요.</p>
      </div>
      <div className="space-y-4 lg:col-span-3">
        <ExpenseSummary expenses={expenses} startDate={startDate} endDate={endDate} />
        <ExpenseList
          expenses={expenses}
          onDelete={async (e) => {
            await deleteExpense(e.id);
          }}
          onEdit={async (e) => {
            await updateExpense(e.id, e);
          }}
        />
      </div>
    </div>
  );
}

function LegSheetBody({
  leg,
  points,
  onChange,
  onDone,
}: {
  leg: RouteLeg;
  points: MapPoint[];
  onChange: (id: string, patch: Partial<RouteLeg>) => void;
  onDone: () => void;
}) {
  const from = points.find((p) => p.id === leg.from_point_id);
  const to = points.find((p) => p.id === leg.to_point_id);
  if (!from || !to) return null;
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold">
        {from.name} <span className="text-foreground/35">→</span> {to.name}
      </p>
      <LegEditor
        from={from}
        to={to}
        method={leg.method}
        cost={leg.cost}
        onMethodChange={(method) => onChange(leg.id, { method })}
        onCalculated={(r) => {
          if (r.durationMin !== leg.duration_min || r.distanceKm !== leg.distance_km) {
            onChange(leg.id, { duration_min: r.durationMin, distance_km: r.distanceKm });
          }
        }}
        onCostChange={(cost) => onChange(leg.id, { cost })}
      />
      <p className="text-xs leading-relaxed text-foreground/50">
        시간·거리는 직선거리와 이동수단별 평균 속도로 낸 추정치예요. 비용은 원화로 적으면 그날 합계에 더해져요.
      </p>
      <button onClick={onDone} className="btn btn-primary w-full py-3 text-sm">
        완료
      </button>
    </div>
  );
}
