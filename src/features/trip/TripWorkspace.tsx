"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  CalendarRange,
  Luggage,
  MapPin,
  Plane,
  Route as RouteIcon,
} from "lucide-react";
import type { MapPoint, Trip } from "@/lib/types";
import { useTripData, persistOrder, addPoint, ensureLeg, updateLeg } from "./useTripData";
import { TripMap, AddPointDialog, type PointDraft } from "@/features/map";
import PlaceSearch, { type PickedPlace } from "@/features/map/PlaceSearch";
import { getCountryCenter } from "@/data/countryCenters";
import PointListMini from "@/features/map/PointListMini";
import DayTabs from "@/features/route/DayTabs";
import ItineraryList from "@/features/route/ItineraryList";
import RouteTimeline from "@/features/route/RouteTimeline";
import DaySummary from "@/features/route/DaySummary";
import LegEditor from "@/features/route/LegEditor";
import SearchTabs from "@/features/search/SearchTabs";
import ExpenseForm from "@/features/expenses/ExpenseForm";
import ExpenseList from "@/features/expenses/ExpenseList";
import ExpenseSummary from "@/features/expenses/ExpenseSummary";
import { useExpenses } from "@/features/expenses/useExpenses";
import ChecklistPanel from "@/features/prep/ChecklistPanel";
import DocsPanel from "@/features/prep/DocsPanel";
import CountryBackdrop from "@/features/ui/CountryBackdrop";

type Tab = "plan" | "search" | "expenses" | "prep";

const TABS: { id: Tab; label: string; icon: typeof MapPin }[] = [
  { id: "plan", label: "지도·일정", icon: MapPin },
  { id: "search", label: "항공·숙소", icon: Plane },
  { id: "expenses", label: "가계부", icon: Banknote },
  { id: "prep", label: "준비물", icon: Luggage },
];

export default function TripWorkspace({ tripId }: { tripId: string }) {
  const { trip, points, legs, loading, notConfigured, setPoints, setLegs } =
    useTripData(tripId);
  const { expenses } = useExpenses(tripId);
  const [tab, setTab] = useState<Tab>("plan");
  const [day, setDay] = useState(1);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  /** 지도 POI 라벨 클릭 시 자동 완성되는 장소 정보 */
  const [poiPrefill, setPoiPrefill] = useState<{ name: string; category: MapPoint["category"] } | null>(null);

  const dayPoints = useMemo(
    () =>
      points
        .filter((p) => p.day_number === day)
        .sort((a, b) => (a.visit_order ?? 99) - (b.visit_order ?? 99)),
    [points, day],
  );
  const dayLegs = useMemo(() => {
    const ids = new Set(dayPoints.map((p) => p.id));
    return legs.filter((l) => ids.has(l.from_point_id) && ids.has(l.to_point_id));
  }, [legs, dayPoints]);

  async function handleReorder(orderedIds: string[]) {
    setPoints((prev) =>
      prev.map((p) => {
        const idx = orderedIds.indexOf(p.id);
        return idx >= 0 ? { ...p, visit_order: idx + 1 } : p;
      }),
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
    const created = await addPoint(
      tripId,
      { ...draft, lat: pendingLatLng.lat, lng: pendingLatLng.lng },
      day,
      maxOrder + 1,
    );
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

  function handleLegChange(legId: string, patch: Partial<MapPoint> | Record<string, unknown>) {
    setLegs((prev) => prev.map((l) => (l.id === legId ? { ...l, ...patch } : l)));
    updateLeg(legId, patch as never);
  }

  if (notConfigured) {
    return (
      <div className="card mx-auto mt-20 max-w-md p-8 text-center">
        <CalendarRange className="mx-auto text-primary" size={40} />
        <h2 className="mt-4 text-lg font-bold">Supabase 연결 필요</h2>
        <p className="mt-2 text-sm text-foreground/60">
          .env.local에 Supabase 키를 설정하고 마이그레이션을 실행하세요.
          <br />
          <code className="mt-2 block rounded bg-surface-muted p-2 text-xs">
            supabase/migrations/0001_init.sql
          </code>
        </p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary-strong">
          ← 홈으로
        </Link>
      </div>
    );
  }

  if (loading || !trip) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          animate={{ y: [-6, 6, -6] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          className="text-primary"
        >
          <Plane size={44} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 md:px-6 xl:max-w-[96rem]">
      {/* 헤더 */}
      <header className="relative isolate flex items-center justify-between overflow-hidden rounded-2xl px-4 py-5 shadow-card md:px-6 md:py-7">
        <CountryBackdrop country={trip.country} continent={trip.continent ?? undefined} />
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-primary-strong"
          >
            <ArrowLeft size={15} /> 내 여행
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl xl:text-4xl">
            {trip.title}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-foreground/60">
            <MapPin size={14} className="text-accent" />
            {[trip.continent, trip.country, trip.region].filter(Boolean).join(" · ")}
            <span className="ml-2 inline-flex items-center gap-1">
              <CalendarRange size={14} className="text-mint" />
              {trip.start_date} ~ {trip.end_date}
            </span>
          </p>
        </div>
      </header>

      {/* 탭 */}
      <nav className="mb-6 flex gap-1 rounded-full border border-border-subtle bg-surface p-1 shadow-sm sm:w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors md:px-5 md:py-2.5 ${
              tab === id ? "text-white" : "text-foreground/60 hover:text-primary-strong"
            }`}
          >
            {tab === id && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", bounce: 0.25, duration: 0.45 }}
              />
            )}
            <Icon size={15} className="relative z-10" />
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </nav>

      {/* 지도·일정 — 모바일에선 Day 선택이 최상단, 데스크톱에선 지도 3 : 사이드 2 */}
      {tab === "plan" && (
        <div className="fade-up grid gap-5 lg:grid-cols-5 xl:gap-7">
          {/* 모바일용 Day 탭 (데스크톱에선 aside의 것 사용) */}
          <div className="lg:hidden">
            <DayTabs trip={trip} value={day} onChange={setDay} />
          </div>

          <div className="space-y-4 lg:col-span-3 xl:space-y-5">
            <div className="relative card overflow-hidden p-0">
              {/* 지도 위 장소 검색 (카카오 로컬) */}
              <div className="absolute left-3 top-3 z-10">
                <PlaceSearch
                  center={
                    dayPoints.length > 0
                      ? {
                          lat: dayPoints.reduce((s, p) => s + p.lat, 0) / dayPoints.length,
                          lng: dayPoints.reduce((s, p) => s + p.lng, 0) / dayPoints.length,
                        }
                      : getCountryCenter(trip.country)
                  }
                  onPick={(place: PickedPlace) => {
                    setPendingLatLng({ lat: place.lat, lng: place.lng });
                    setPoiPrefill({ name: place.name, category: place.category });
                  }}
                />
              </div>
              <TripMap
                points={points.filter((p) => p.day_number === day)}
                legs={dayLegs}
                expenses={expenses}
                defaultCenter={getCountryCenter(trip.country)}
                selectedPointId={selectedPointId}
                onMapClick={(latlng: { lat: number; lng: number }, poi) => {
                  setPendingLatLng(latlng);
                  setPoiPrefill(poi ?? null);
                }}
                onPointClick={(id: string) => setSelectedPointId(id)}
                editable
              />
            </div>
            <DaySummary points={dayPoints} legs={dayLegs} />
            <RouteTimeline points={dayPoints} legs={dayLegs} />
          </div>

          <aside className="hidden space-y-4 lg:col-span-2 lg:block xl:space-y-5">
            <DayTabs trip={trip} value={day} onChange={setDay} />
            <ItineraryList
              points={dayPoints}
              onReorder={handleReorder}
              onDelete={(id) => {
                setPoints((prev) => prev.filter((p) => p.id !== id));
              }}
            />
            <p className="flex items-center gap-1.5 text-xs text-foreground/40">
              <RouteIcon size={13} /> 지도를 클릭해 새 포인트를 추가하고, 드래그로 방문 순서를
              바꿔보세요.
            </p>
          </aside>

          {/* 모바일용 일정 리스트 */}
          <div className="space-y-4 lg:hidden">
            <ItineraryList
              points={dayPoints}
              onReorder={handleReorder}
              onDelete={(id) => {
                setPoints((prev) => prev.filter((p) => p.id !== id));
              }}
            />
          </div>
        </div>
      )}

      {/* 항공·숙소 검색 — 다른 탭과 동일한 grid 프레임(간격·페이드) 사용 */}
      {tab === "search" && (
        <div className="fade-up grid gap-5 lg:grid-cols-5 xl:gap-7">
          <div className="space-y-4 lg:col-span-5 xl:space-y-5">
            <SearchTabs
              flightDefaults={{
                origin: "ICN",
                destination: undefined,
                date: trip.start_date ?? undefined,
              }}
              hotelDefaults={{
                checkIn: trip.start_date ?? undefined,
                checkOut: trip.end_date ?? undefined,
              }}
            />
          </div>
        </div>
      )}

      {/* 가계부 */}
      {tab === "expenses" && <ExpensesTab tripId={tripId} dayPoints={dayPoints} day={day} />}

      {/* 준비물 */}
      {tab === "prep" && (
        <div className="fade-up grid gap-5 lg:grid-cols-2 xl:gap-7">
          <ChecklistPanel tripId={tripId} />
          <DocsPanel tripId={tripId} />
        </div>
      )}

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
    </div>
  );
}

function ExpensesTab({
  tripId,
  dayPoints,
  day,
}: {
  tripId: string;
  dayPoints: MapPoint[];
  day: number;
}) {
  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses(tripId);
  const pointOptions = dayPoints.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="fade-up grid gap-5 lg:grid-cols-5 xl:gap-7">
      <div className="space-y-4 lg:col-span-2 xl:space-y-5">
        <ExpenseForm
          baseCurrency="KRW"
          onSubmit={async (input) => {
            const saved = await addExpense({ ...input, day_number: day });
            return saved !== null;
          }}
        />
        {pointOptions.length > 0 && (
          <p className="text-xs text-foreground/40">
            오늘(Day {day}) 방문지에 지출을 연결할 수 있어요.
          </p>
        )}
      </div>
      <div className="space-y-4 lg:col-span-3 xl:space-y-5">
        <ExpenseSummary expenses={expenses} />
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
