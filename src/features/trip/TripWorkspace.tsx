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
  NotebookPen,
  PencilLine,
  Plane,
  Share2,
  LogOut,
  Lock,
} from "lucide-react";
import type { Access, Expense, MapPoint, RouteLeg, Trip } from "@/lib/types";
import { apiDelete, apiPatch, setTripToken } from "@/lib/api";
import { useSyncStatus } from "@/lib/realtime";
import { useTripData, persistOrder, addPoint, ensureLeg, deletePoint, updateLeg } from "./useTripData";
import { TripMap, AddPointDialog, type PointDraft } from "@/features/map";
import PlaceSearch, { type PickedPlace } from "@/features/map/PlaceSearch";
import { getTripCenter } from "@/data/countryCenters";
import DayTabs, { BIN_DAY } from "@/features/route/DayTabs";
import { optimizeOrder } from "@/features/route/optimize";
import DayPlan from "@/features/route/DayPlan";
import { estimateDirections, fetchDirections } from "@/features/route/directions";
import { adjacentLegs, formatDuration } from "@/features/route/schedule";
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
import { ddayLabel, formatRange, nights, stayLabel, tripPhase } from "@/features/ui/dates";
import SharePanel from "./SharePanel";
import RecordTab from "@/features/archive/RecordTab";
import NowCard from "@/features/route/NowCard";
import { useForecast } from "@/features/route/weather";
import SettleCard from "@/features/expenses/SettleCard";
import LocalInfoCard from "@/features/prep/LocalInfoCard";
import PrefsToggle from "@/i18n/PrefsToggle";
import { usePrefs, useT } from "@/i18n/I18nProvider";

type Tab = "plan" | "expenses" | "prep" | "record";

const TABS: { id: Tab; label: string; icon: typeof MapPin }[] = [
  { id: "plan", label: "일정", icon: MapPin },
  { id: "expenses", label: "가계부", icon: Banknote },
  { id: "prep", label: "준비", icon: Luggage },
  { id: "record", label: "기록", icon: NotebookPen },
];

/**
 * mode="admin": 로그인한 관리자·사용 회원 화면 (실제 권한은 API가 돌려준 trip.access 로 정한다)
 * mode="edit" | "view": 공유 링크·체험 회원 화면
 */
export default function TripWorkspace({ tripId, mode }: { tripId: string; mode: Access }) {
  const { t, locale } = usePrefs();
  const inApp = mode === "admin";
  // 로그인 화면에서는 이전에 열었던 공유 링크 토큰을 쓰지 않는다
  if (inApp) setTripToken(null);

  const { trip, points, legs, loading, notConfigured, revoked, setTrip, setPoints, setLegs } = useTripData(tripId);
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
  /** 고르기 전에는 다녀온 여행이면 기록, 아니면 일정 */
  const [pickedTab, setTab] = useState<Tab | null>(null);
  const [pickedDay, setDay] = useState<number | null>(null);
  // 여행 중이면 오늘 Day 부터 연다
  const now = trip ? tripPhase(trip) : null;
  const todayDay = now?.phase === "ongoing" ? (now.dayIndex ?? null) : null;
  const day = pickedDay ?? todayDay ?? 1;
  const center = trip ? getTripCenter(trip.country, trip.region) : null;
  const forecast = useForecast(center?.lat, center?.lng, trip?.start_date ?? null, trip?.end_date ?? null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  /** 지도 POI 라벨이나 검색 결과로 미리 채울 장소 정보 */
  const [poiPrefill, setPoiPrefill] = useState<{ name: string; category: MapPoint["category"] } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  /** 후보함(BIN_DAY)이면 아직 Day 를 정하지 않은 장소 */
  const inBin = day === BIN_DAY;
  const pointsOf = (d: number | null) =>
    points.filter((p) => p.day_number === d).sort((a, b) => (a.visit_order ?? 99) - (b.visit_order ?? 99));
  const dayPoints = useMemo(() => pointsOf(inBin ? null : day), [points, day, inBin]); // eslint-disable-line react-hooks/exhaustive-deps
  // 후보함은 순서가 없으니 이동 구간도 없다
  const dayLegs = useMemo(() => (inBin ? [] : adjacentLegs(dayPoints, legs)), [legs, dayPoints, inBin]);
  const binCount = points.filter((p) => p.day_number == null).length;
  const tripDays = trip ? (nights(trip) ?? -1) + 1 : 0;
  /** 동선 정리 직후 되돌리기용: 정리 전·후 순서 */
  const [undo, setUndo] = useState<{ day: number; before: string[]; after: string[] } | null>(null);
  const canUndo = undo?.day === day && undo.after.join() === dayPoints.map((p) => p.id).join();

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
      return e instanceof Error ? e.message : t("저장하지 못했어요.");
    }
  }

  /** 예산·동행자 등 여행 정보: 화면은 바로 바꾸고 저장 실패하면 되돌린다 */
  async function patchTrip(patch: Partial<Trip>) {
    const before = trip;
    setTrip((t) => (t ? { ...t, ...patch } : t));
    try {
      await apiPatch(`/api/trips/${tripId}`, patch);
    } catch {
      setTrip(before);
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
    if (inBin) return;
    // 순서가 바뀐 인접 구간의 leg 확보
    const updated: typeof legs = [...legs];
    for (let i = 0; i < orderedIds.length - 1; i++) {
      const leg = await ensureLeg(tripId, orderedIds[i], orderedIds[i + 1]);
      if (leg && !updated.some((l) => l.id === leg.id)) updated.push(leg);
    }
    setLegs(updated);
  }

  /** 이동 거리가 짧은 순서로. 이미 그 순서면 false */
  function handleOptimize() {
    const before = dayPoints.map((p) => p.id);
    const after = optimizeOrder(dayPoints).map((p) => p.id);
    if (before.join() === after.join()) return false;
    setUndo({ day, before, after });
    void handleReorder(after);
    return true;
  }

  /** 다른 Day 나 후보함(null)으로 옮긴다: 새 자리의 맨 끝에 붙이고, 비운 자리 앞뒤는 다시 잇는다 */
  async function movePoint(id: string, target: number | null) {
    const p = points.find((x) => x.id === id);
    if (!p || p.day_number === target) return null;
    const from = pointsOf(p.day_number);
    const idx = from.findIndex((x) => x.id === id);
    const dest = pointsOf(target);
    const order = Math.max(0, ...dest.map((x) => x.visit_order ?? 0)) + 1;
    try {
      await apiPatch(`/api/map-points/${id}`, { day_number: target, visit_order: order });
    } catch (e) {
      return e instanceof Error ? e.message : t("저장하지 못했어요.");
    }
    setPoints((prev) => prev.map((x) => (x.id === id ? { ...x, day_number: target, visit_order: order } : x)));
    const links: [string, string][] = [];
    if (p.day_number != null && from[idx - 1] && from[idx + 1]) links.push([from[idx - 1].id, from[idx + 1].id]);
    if (target != null && dest.length) links.push([dest[dest.length - 1].id, id]);
    for (const [a, b] of links) {
      const leg = await ensureLeg(tripId, a, b);
      if (leg) setLegs((prev) => [...prev.filter((l) => l.id !== leg.id), leg]);
    }
    return null;
  }

  async function handlePointCreate(draft: PointDraft) {
    if (!pendingLatLng) return;
    const maxOrder = Math.max(0, ...dayPoints.map((p) => p.visit_order ?? 0));
    const created = await addPoint(tripId, { ...draft, lat: pendingLatLng.lat, lng: pendingLatLng.lng }, inBin ? null : day, maxOrder + 1);
    if (created) {
      setPoints((prev) => [...prev, created]);
      const prevPoint = inBin ? null : dayPoints[dayPoints.length - 1];
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
    if (!inBin && before && after) {
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
        <h2 className="mt-4 text-lg font-bold">{t("이 여행에 더는 들어올 수 없어요")}</h2>
        <p className="mt-2 text-sm text-foreground/65">
          {inApp
            ? t("초대가 취소되었거나, 여행이 삭제되었거나, 계정 권한이 바뀌었어요.")
            : t("링크가 새로 바뀌었거나 여행이 삭제되었어요. 링크를 보낸 사람에게 새 링크를 받아 주세요.")}
        </p>
        {inApp && (
          <Link href="/" className="btn btn-ghost mt-5 px-5 py-2.5 text-sm">
            {t("내 여행으로")}
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
        <h2 className="mt-4 text-lg font-bold">{t("여행을 열 수 없어요")}</h2>
        <p className="mt-2 text-sm text-foreground/65">
          {inApp
            ? t("삭제되었거나 초대가 취소되었을 수 있어요.")
            : t("삭제되었거나 링크가 바뀌었을 수 있어요. 링크를 보낸 사람에게 새 링크를 받아 주세요.")}
        </p>
        {inApp && (
          <Link href="/" className="btn btn-ghost mt-5 px-5 py-2.5 text-sm">
            {t("내 여행으로")}
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
  // 기록은 여행 중이거나 다녀온 뒤에만
  const hasRecord = phase.phase === "ongoing" || phase.phase === "past";
  const tabs = hasRecord ? TABS : TABS.filter((t) => t.id !== "record");
  const tab: Tab = pickedTab && tabs.some((t) => t.id === pickedTab) ? pickedTab : phase.phase === "past" ? "record" : "plan";
  const stay = stayLabel(trip, locale);
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
                aria-label={t("내 여행으로")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 backdrop-blur-md transition hover:bg-black/40"
              >
                <ArrowLeft size={18} />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                {mode === "edit" ? <PencilLine size={13} /> : <Eye size={13} />}
                {mode === "edit" ? t("공유받은 여행 · 함께 편집 중") : t("공유받은 여행 · 보기 전용")}
              </span>
            )}
            <span className="ml-auto flex items-center gap-2">
              {/* 로그인 화면은 데스크톱 상단 바에 이미 있다 */}
              <PrefsToggle tone="light" className={inApp ? "md:hidden" : ""} />
              <SyncBadge status={sync} />
              {inApp && canManage && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-lift transition active:scale-95"
                >
                  <Share2 size={15} /> {t("공유")}
                </button>
              )}
              {inApp && access === "edit" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                  <PencilLine size={13} />
                  {trip.owner_username
                    ? t("{name}님의 여행 · 함께 편집", { name: trip.owner_username })
                    : t("초대받은 여행 · 함께 편집")}
                </span>
              )}
              {inApp && access === "edit" && (
                leaving === "confirm" ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                    {t("나갈까요?")}
                    <button onClick={() => void leaveTrip()} className="font-bold text-orange-300">
                      {t("나가기")}
                    </button>
                    <button onClick={() => setLeaving(null)} className="text-white/75">
                      {t("취소")}
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setLeaving("confirm")}
                    disabled={leaving === "busy"}
                    aria-label={t("이 여행에서 나가기")}
                    title={t("이 여행에서 나가기")}
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
                phase.phase === "ongoing" ? "bg-mint text-white" : "bg-surface/90 text-foreground"
              }`}
            >
              {ddayLabel(trip, locale)}
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-5xl">{trip.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/88">
              <span>
                <MapPin size={14} className="inline -mt-0.5" /> {[trip.country, trip.region].filter(Boolean).map((s) => t(s!)).join(" · ")}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={14} />
                {formatRange(trip, locale)}
                {stay && ` · ${stay}`}
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* 탭 */}
      <div className="glass sticky top-0 z-30 border-b border-border-subtle md:top-16">
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 py-2 md:px-0 md:py-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-sm font-semibold transition-colors md:flex-none md:px-5 ${
                tab === id ? "text-white" : "text-foreground/65 hover:text-foreground"
              }`}
            >
              {tab === id && (
                <motion.span
                  layoutId="trip-tab"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                />
              )}
              <Icon size={15} className="relative" />
              <span className="relative">{t(label)}</span>
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
                <DayTabs trip={trip} value={day} onChange={setDay} forecast={forecast} today={todayDay} bin={canEdit || binCount > 0 ? binCount : undefined} />
                {day === todayDay && <NowCard points={dayPoints} legs={dayLegs} />}
                <div className="grid gap-4 lg:grid-cols-5 lg:items-start lg:gap-6">
                  {/* 데스크톱: 목록을 내려도 지도는 그 자리에 (상단 바 + 탭 바 아래) */}
                  <div className="lg:sticky lg:top-36 lg:col-span-3">
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
                        // 휴대폰에서는 지도를 낮춰 일정 목록이 첫 화면에 보이게
                        heightClass="h-[300px] sm:h-[420px] lg:h-[520px]"
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <DayPlan
                      points={dayPoints}
                      legs={dayLegs}
                      bin={inBin}
                      onOpen={(p) => setDetailId(p.id)}
                      onReorder={canEdit ? handleReorder : undefined}
                      onDelete={canEdit ? handlePointDelete : undefined}
                      onLegClick={canEdit ? (leg) => setLegEditId(leg.id) : undefined}
                      onOptimize={canEdit ? handleOptimize : undefined}
                      onUndo={
                        canUndo && undo
                          ? () => {
                              void handleReorder(undo.before);
                              setUndo(null);
                            }
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {tab === "expenses" && (
              <ExpensesTab tripId={tripId} day={day} canEdit={canEdit} trip={trip} onPatchTrip={patchTrip} />
            )}

            {tab === "record" && (
              <RecordTab
                trip={trip}
                points={points}
                legs={legs}
                expenses={expenses}
                canEdit={canEdit}
                onSavePoint={savePoint}
              />
            )}

            {tab === "prep" && (
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
                <LocalInfoCard country={trip.country} region={trip.region} />
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

      <PlaceDetail
        point={detailPoint}
        canEdit={canEdit}
        onClose={() => setDetailId(null)}
        onSave={savePoint}
        dayCount={tripDays}
        onMove={movePoint}
      />

      <Sheet open={editingLeg !== null} onClose={() => setLegEditId(null)} title={t("이동 구간")}>
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
  trip,
  onPatchTrip,
}: {
  tripId: string;
  day: number;
  canEdit: boolean;
  trip: Trip;
  onPatchTrip: (patch: Partial<Trip>) => void;
}) {
  const t = useT();
  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses(tripId);
  const [editing, setEditing] = useState<Expense | null>(null);
  const travelers = trip.travelers ?? [];
  const summary = (
    <ExpenseSummary
      expenses={expenses}
      startDate={trip.start_date}
      endDate={trip.end_date}
      budgetKrw={trip.budget_krw}
      onBudgetChange={canEdit ? (budget_krw) => onPatchTrip({ budget_krw }) : undefined}
    />
  );
  const settleCard = (
    <SettleCard
      travelers={travelers}
      expenses={expenses}
      onTravelersChange={canEdit ? (names) => onPatchTrip({ travelers: names }) : undefined}
    />
  );

  if (!canEdit) {
    return (
      <div className="space-y-4">
        {summary}
        {settleCard}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
      <div className="space-y-4 lg:col-span-2">
        <ExpenseForm
          key={editing?.id ?? "new"}
          baseCurrency={trip.base_currency || "KRW"}
          travelers={travelers}
          editing={editing}
          onCancelEdit={() => setEditing(null)}
          onSubmit={async (input) => {
            if (!editing) return (await addExpense({ ...input, day_number: day })) !== null;
            // 바뀐 칸만 보낸다. 금액·통화·날짜가 그대로면 환율도 그대로 둔다
            const patch = Object.fromEntries(
              Object.entries(input).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(editing[k as keyof Expense] ?? null))
            );
            return Object.keys(patch).length === 0 || updateExpense(editing.id, patch);
          }}
        />
        <p className="px-1 text-xs text-foreground/68">
          {editing
            ? t("'{title}' 수정 중이에요.", { title: editing.title })
            : t("새 지출은 지금 보고 있는 Day {day}에 기록돼요.", { day })}
        </p>
        {settleCard}
      </div>
      <div className="space-y-4 lg:col-span-3">
        {summary}
        <ExpenseList
          expenses={expenses}
          onDelete={async (e) => {
            await deleteExpense(e.id);
          }}
          onEdit={(e) => {
            setEditing(e);
            window.scrollTo({ top: 0, behavior: "smooth" });
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
  const { t, locale } = usePrefs();
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
        <h4 className="mb-2 text-xs font-bold text-foreground/65">{t("이동수단")}</h4>
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
                {t(meta.label)}
              </motion.button>
            );
          })}
        </div>
      </section>

      <section>
        <h4 className="mb-2 flex items-center justify-between text-xs font-bold text-foreground/65">
          {t("소요 시간")}
          <span className="font-medium text-foreground/68">{t("거리 약 {km}km", { km: est.distanceKm })}</span>
        </h4>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setMinutes(minutes - 5)}
            aria-label={t("5분 줄이기")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-xl font-bold text-foreground/72 active:scale-90"
          >
            −
          </button>
          <div className="min-w-32 text-center">
            <p className="text-3xl font-extrabold tabular-nums">{formatDuration(minutes, locale)}</p>
            <p className="text-[11px] text-foreground/68">
              {leg.duration_min == null || leg.duration_min === est.durationMin ? t("추정치") : t("추정 {time}", { time: formatDuration(est.durationMin, locale) })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMinutes(minutes + 5)}
            aria-label={t("5분 늘리기")}
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
                minutes === m ? "bg-ink text-white" : "bg-surface-muted text-foreground/72 hover:bg-primary-soft"
              }`}
            >
              {formatDuration(m, locale)}
            </button>
          ))}
          {leg.duration_min !== est.durationMin && (
            <button
              type="button"
              onClick={() => setMinutes(est.durationMin)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary-strong hover:bg-primary-soft"
            >
              {t("추정치로")}
            </button>
          )}
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-bold text-foreground/65">{t("이동 비용")}</h4>
        <MoneyInput value={leg.cost} onChange={(cost) => onChange(leg.id, { cost })} />
      </section>

      <p className="text-xs leading-relaxed text-foreground/68">
        {t("추정 시간은 직선거리와 이동수단별 평균 속도로 계산해요. 실제와 다르면 직접 맞춰 주세요. 타임테이블과 하루 합계에 바로 반영돼요.")}
      </p>
      <button onClick={onDone} className="btn btn-primary w-full py-3 text-sm">
        {t("완료")}
      </button>
    </div>
  );
}

/** 실시간 연결 상태. live 면 다른 사람의 변경이 바로, polling 이면 몇 초 안에 반영된다 */
function SyncBadge({ status }: { status: ReturnType<typeof useSyncStatus> }) {
  const t = useT();
  const meta = {
    live: { dot: "bg-mint", label: "실시간 반영 중" },
    polling: { dot: "bg-amber-400", label: "몇 초마다 반영" },
    connecting: { dot: "bg-white/70 animate-pulse", label: "연결 중" },
    offline: { dot: "bg-accent", label: "연결 끊김" },
  }[status];
  return (
    <span
      title={t(meta.label)}
      className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur-md"
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      <span className="hidden sm:inline">{t(meta.label)}</span>
    </span>
  );
}
