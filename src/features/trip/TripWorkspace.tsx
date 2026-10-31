"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  LogOut,
  Lock,
} from "lucide-react";
import type { Access, MapPoint, RouteLeg } from "@/lib/types";
import { apiDelete, apiPatch, setTripToken } from "@/lib/api";
import { useSyncStatus } from "@/lib/realtime";
import { useTripData, persistOrder, addPoint, ensureLeg, deletePoint, updateLeg } from "./useTripData";
import { TripMap, AddPointDialog, type PointDraft } from "@/features/map";
import PlaceSearch, { type PickedPlace } from "@/features/map/PlaceSearch";
import { getTripCenter } from "@/data/countryCenters";
import DayTabs from "@/features/route/DayTabs";
import ItineraryList from "@/features/route/ItineraryList";
import RouteTimeline from "@/features/route/RouteTimeline";
import DaySummary from "@/features/route/DaySummary";
import { estimateDirections, fetchDirections } from "@/features/route/directions";
import { formatDuration } from "@/features/route/schedule";
import { METHOD_META } from "@/features/route/meta";
import { PointBadge } from "@/features/map/pointStyle";
import MoneyInput from "@/features/ui/MoneyInput";
import Sheet from "@/features/ui/Sheet";
import PlaceDetail, { type PointPatch } from "./PlaceDetail";
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

/**
 * mode="admin": 로그인한 관리자·사용 회원 화면 (실제 권한은 API가 돌려준 trip.access 로 정한다)
 * mode="edit" | "view": 공유 링크·체험 회원 화면
 */
export default function TripWorkspace({ tripId, mode }: { tripId: string; mode: Access }) {
  const inApp = mode === "admin";
  // 로그인 화면에서는 이전에 열었던 공유 링크 토큰을 쓰지 않는다
  if (inApp) setTripToken(null);

  const { trip, points, legs, loading, notConfigured, revoked, setPoints, setLegs } = useTripData(tripId);
  const router = useRouter();
  const [leaving, setLeaving] = useState<"confirm" | "busy" | null>(null);

  async function leaveTrip() {
    setLeaving("busy");
    try {
      await apiDelete(`/api/trips/${tripId}/members?member_id=me`);
      router.replace("/");
      router.refresh();
    } catch {
      setLeaving(null);
    }
  }
  const access: Access = inApp ? (trip?.access ?? "view") : mode;
  const canEdit = access !== "view";
  const canManage = access === "admin" || access === "owner";
  const sync = useSyncStatus(tripId);
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

  async function savePoint(id: string, patch: PointPatch) {
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

  // 보고 있는 사이에 초대가 취소되거나, 링크가 바뀌거나, 여행이 지워진 경우
  if (revoked) {
    return (
      <div className="mx-auto mt-24 max-w-sm px-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Lock size={26} />
        </div>
        <h2 className="mt-4 text-lg font-bold">이 여행에 더는 들어올 수 없어요</h2>
        <p className="mt-2 text-sm text-foreground/65">
          {inApp
            ? "초대가 취소되었거나, 여행이 삭제되었거나, 계정 권한이 바뀌었어요."
            : "링크가 새로 바뀌었거나 여행이 삭제되었어요. 링크를 보낸 사람에게 새 링크를 받아 주세요."}
        </p>
        {inApp && (
          <Link href="/" className="btn btn-ghost mt-5 px-5 py-2.5 text-sm">
            내 여행으로
          </Link>
        )}
      </div>
    );
  }

  if (notConfigured) {
    return (
      <div className="mx-auto mt-24 max-w-sm px-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <MapPin size={26} />
        </div>
        <h2 className="mt-4 text-lg font-bold">여행을 열 수 없어요</h2>
        <p className="mt-2 text-sm text-foreground/65">
          {inApp
            ? "삭제되었거나 초대가 취소되었을 수 있어요."
            : "삭제되었거나 링크가 바뀌었을 수 있어요. 링크를 보낸 사람에게 새 링크를 받아 주세요."}
        </p>
        {inApp && (
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
      : getTripCenter(trip.country, trip.region);

  return (
    <div className={inApp ? "" : "min-h-dvh pb-16"}>
      {/* 사진 헤더 */}
      <header className="relative isolate overflow-hidden bg-slate-300 text-white md:mx-auto md:mt-6 md:max-w-6xl md:rounded-[1.75rem]">
        <motion.div
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute inset-0 -z-10"
        >
          <CoverPhoto country={trip.country} continent={trip.continent} city={trip.region} title={trip.title} />
        </motion.div>
        <div className="flex min-h-56 flex-col justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] md:min-h-72 md:p-8">
          <div className="flex items-center justify-between gap-2">
            {inApp ? (
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
            <span className="ml-auto flex items-center gap-2">
              <SyncBadge status={sync} />
              {inApp && canManage && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-lift transition active:scale-95"
                >
                  <Share2 size={15} /> 공유
                </button>
              )}
              {inApp && access === "edit" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                  <PencilLine size={13} />
                  {trip.owner_username ? `${trip.owner_username}님의 여행` : "초대받은 여행"} · 함께 편집
                </span>
              )}
              {inApp && access === "edit" && (
                leaving === "confirm" ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                    나갈까요?
                    <button onClick={() => void leaveTrip()} className="font-bold text-orange-300">
                      나가기
                    </button>
                    <button onClick={() => setLeaving(null)} className="text-white/75">
                      취소
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setLeaving("confirm")}
                    disabled={leaving === "busy"}
                    aria-label="이 여행에서 나가기"
                    title="이 여행에서 나가기"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 backdrop-blur-md transition hover:bg-black/40 disabled:opacity-50"
                  >
                    <LogOut size={15} />
                  </button>
                )
              )}
            </span>
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
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/88">
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
                tab === id ? "text-white" : "text-foreground/65 hover:text-foreground"
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
                        defaultCenter={getTripCenter(trip.country, trip.region)}
                        labelCountry={trip.country}
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
                        <ItineraryList
                          points={dayPoints}
                          onReorder={handleReorder}
                          onDelete={handlePointDelete}
                          onOpen={(p) => setDetailId(p.id)}
                        />
                        <p className="flex items-center gap-1.5 px-1 text-xs text-foreground/68">
                          <MousePointerClick size={13} /> 지도를 누르거나 장소를 검색해 핀을 꽂고, 끌어서 순서를 바꿔요.
                        </p>
                      </>
                    )}
                    {canEdit && dayLegs.length > 0 && (
                      <p className="px-1 text-xs text-foreground/68">구간(이동수단 표시)을 누르면 이동수단·시간·비용을 바꿀 수 있어요. 장소를 누르면 사진·링크를 붙여요.</p>
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
          country={trip.country}
          onCancel={() => {
            setPendingLatLng(null);
            setPoiPrefill(null);
          }}
          onSave={handlePointCreate}
        />
      )}

      {inApp && canManage && (
        <SharePanel open={shareOpen} onClose={() => setShareOpen(false)} trip={trip} isAdmin={access === "admin"} />
      )}

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
        <p className="px-1 text-xs text-foreground/68">새 지출은 지금 보고 있는 Day {day}에 기록돼요.</p>
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

const LEG_METHODS: RouteLeg["method"][] = ["walk", "transit", "taxi", "bike", "rental-car", "plane", "ferry"];
const MINUTE_PRESETS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

/** 구간 편집: 이동수단 · 소요 시간(직접 지정) · 비용 */
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
  const est = estimateDirections(from, to, leg.method);
  const minutes = leg.duration_min ?? est.durationMin;
  const setMinutes = (m: number) => onChange(leg.id, { duration_min: Math.max(0, Math.min(24 * 60, Math.round(m))) });

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <PointBadge point={from} size={26} /> <span className="truncate">{from.name}</span>
        <span className="text-foreground/68">→</span>
        <PointBadge point={to} size={26} /> <span className="truncate">{to.name}</span>
      </p>

      <section>
        <h4 className="mb-2 text-xs font-bold text-foreground/65">이동수단</h4>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          {LEG_METHODS.map((m) => {
            const meta = METHOD_META[m];
            const Icon = meta.icon;
            const on = m === leg.method;
            return (
              <motion.button
                key={m}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  // 이동수단을 바꾸면 그 수단 기준 추정 시간으로 다시 채운다 (이후 직접 조정 가능)
                  const e = estimateDirections(from, to, m);
                  onChange(leg.id, { method: m, duration_min: e.durationMin, distance_km: e.distanceKm });
                }}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[11px] font-semibold transition ${
                  on ? "border-primary bg-primary text-white shadow-sm" : "border-border-subtle text-foreground/72 hover:border-primary/40"
                }`}
              >
                <Icon size={18} />
                {meta.label}
              </motion.button>
            );
          })}
        </div>
      </section>

      <section>
        <h4 className="mb-2 flex items-center justify-between text-xs font-bold text-foreground/65">
          소요 시간
          <span className="font-medium text-foreground/68">거리 약 {est.distanceKm}km</span>
        </h4>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setMinutes(minutes - 5)}
            aria-label="5분 줄이기"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-xl font-bold text-foreground/72 active:scale-90"
          >
            −
          </button>
          <div className="min-w-32 text-center">
            <p className="text-3xl font-extrabold tabular-nums">{formatDuration(minutes)}</p>
            <p className="text-[11px] text-foreground/68">
              {leg.duration_min == null || leg.duration_min === est.durationMin ? "추정치" : `추정 ${formatDuration(est.durationMin)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMinutes(minutes + 5)}
            aria-label="5분 늘리기"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-xl font-bold text-foreground/72 active:scale-90"
          >
            +
          </button>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {MINUTE_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                minutes === m ? "bg-foreground text-white" : "bg-surface-muted text-foreground/72 hover:bg-primary-soft"
              }`}
            >
              {formatDuration(m)}
            </button>
          ))}
          {leg.duration_min !== est.durationMin && (
            <button
              type="button"
              onClick={() => setMinutes(est.durationMin)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary-strong hover:bg-primary-soft"
            >
              추정치로
            </button>
          )}
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-bold text-foreground/65">이동 비용</h4>
        <MoneyInput value={leg.cost} onChange={(cost) => onChange(leg.id, { cost })} />
      </section>

      <p className="text-xs leading-relaxed text-foreground/68">
        추정 시간은 직선거리와 이동수단별 평균 속도로 계산해요. 실제와 다르면 직접 맞춰 주세요. 타임테이블과 하루 합계에 바로 반영돼요.
      </p>
      <button onClick={onDone} className="btn btn-primary w-full py-3 text-sm">
        완료
      </button>
    </div>
  );
}

/** 실시간 연결 상태. live 면 다른 사람의 변경이 바로, polling 이면 몇 초 안에 반영된다 */
function SyncBadge({ status }: { status: ReturnType<typeof useSyncStatus> }) {
  const meta = {
    live: { dot: "bg-mint", label: "실시간 반영 중" },
    polling: { dot: "bg-amber-400", label: "몇 초마다 반영" },
    connecting: { dot: "bg-white/70 animate-pulse", label: "연결 중" },
    offline: { dot: "bg-accent", label: "연결 끊김" },
  }[status];
  return (
    <span
      title={meta.label}
      className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur-md"
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      <span className="hidden sm:inline">{meta.label}</span>
    </span>
  );
}
