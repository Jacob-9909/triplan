"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, CalendarPlus, Copy, ImageIcon, Luggage, LogOut, MapPin, NotebookPen, Plane, Printer, Lock } from "lucide-react";
import type { Access } from "@/lib/types";
import { apiDelete, apiPatch, setTripToken } from "@/lib/api";
import { useTripData } from "./useTripData";
import { usePointActions } from "./usePointActions";
import PlanTab from "./PlanTab";
import TripHeader, { type HeaderMenuItem } from "./TripHeader";
import ActivitySheet from "./ActivitySheet";
import CoverPicker from "./CoverPicker";
import PrintItinerary from "./PrintItinerary";
import SharePanel from "./SharePanel";
import CalendarLinks from "./CalendarLinks";
import CopyTripDialog from "./CopyTripDialog";
import Sheet from "@/features/ui/Sheet";
import ExpensesTab from "@/features/expenses/ExpensesTab";
import { useExpenses } from "@/features/expenses/useExpenses";
import ChecklistPanel from "@/features/prep/ChecklistPanel";
import DocsPanel from "@/features/prep/DocsPanel";
import LocalInfoCard from "@/features/prep/LocalInfoCard";
import { useTravelDocs } from "@/features/prep/useTravelDocs";
import RecordTab from "@/features/archive/RecordTab";
import { toast } from "@/features/ui/Toast";
import { tripPhase } from "@/features/ui/dates";
import type { Trip } from "@/lib/types";
import { useT } from "@/i18n/I18nProvider";

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
export default function TripWorkspace({
  tripId,
  mode,
  viewToken,
  canCopy = false,
}: {
  tripId: string;
  mode: Access;
  /** 보기 링크로 들어온 경우 그 토큰 (캘린더 구독 주소용) */
  viewToken?: string;
  /** 공유 링크로 들어왔지만 로그인한 사용자: 내 여행으로 복사할 수 있다 */
  canCopy?: boolean;
}) {
  const t = useT();
  const inApp = mode === "admin";
  // 로그인 화면에서는 이전에 열었던 공유 링크 토큰을 쓰지 않는다
  if (inApp) setTripToken(null);

  const { trip, points, legs, routeOptions, loading, notConfigured, revoked, setTrip, setPoints, setLegs, setRouteOptions } =
    useTripData(tripId);
  const actions = usePointActions({ tripId, points, legs, setPoints, setLegs });
  const router = useRouter();
  const access: Access = inApp ? (trip?.access ?? "view") : mode;
  const canEdit = access !== "view";
  const canManage = access === "admin" || access === "owner";
  const { expenses } = useExpenses(tripId);
  const { docs } = useTravelDocs(tripId);

  /** 고르기 전에는 다녀온 여행이면 기록, 아니면 일정 */
  const [pickedTab, setTab] = useState<Tab | null>(null);
  const [pickedDay, setDay] = useState<number | null>(null);
  // 여행 중이면 오늘 Day 부터 연다
  const now = trip ? tripPhase(trip) : null;
  const todayDay = now?.phase === "ongoing" ? (now.dayIndex ?? null) : null;
  const day = pickedDay ?? todayDay ?? 1;

  const [shareOpen, setShareOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  /** 예산·동행자·커버 등 여행 정보: 화면은 바로 바꾸고 저장 실패하면 되돌린다 */
  async function patchTrip(patch: Partial<Trip>) {
    const before = trip;
    setTrip((cur) => (cur ? { ...cur, ...patch } : cur));
    try {
      await apiPatch(`/api/trips/${tripId}`, patch);
    } catch (e) {
      setTrip(before);
      throw e;
    }
  }

  async function leaveTrip() {
    if (!window.confirm(t("이 여행에서 나갈까요? 다시 들어오려면 주인에게 초대를 받아야 해요."))) return;
    try {
      await apiDelete(`/api/trips/${tripId}/members?member_id=me`);
      router.replace("/");
      router.refresh();
    } catch {
      toast({ message: t("나가지 못했어요. 잠시 뒤 다시 시도해 주세요."), tone: "error" });
    }
  }

  // 보고 있는 사이에 초대가 취소되거나, 링크가 바뀌거나, 여행이 지워진 경우
  if (revoked || notConfigured) {
    return (
      <div className="mx-auto mt-24 max-w-sm px-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          {revoked ? <Lock size={26} /> : <MapPin size={26} />}
        </div>
        <h2 className="mt-4 text-lg font-bold">{revoked ? t("이 여행에 더는 들어올 수 없어요") : t("여행을 열 수 없어요")}</h2>
        <p className="mt-2 text-sm text-foreground/65">
          {revoked
            ? inApp
              ? t("초대가 취소되었거나, 여행이 삭제되었거나, 계정 권한이 바뀌었어요.")
              : t("링크가 새로 바뀌었거나 여행이 삭제되었어요. 링크를 보낸 사람에게 새 링크를 받아 주세요.")
            : inApp
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
  const tabs = hasRecord ? TABS : TABS.filter((x) => x.id !== "record");
  const tab: Tab = pickedTab && tabs.some((x) => x.id === pickedTab) ? pickedTab : phase.phase === "past" ? "record" : "plan";

  // 캘린더 구독은 보기 토큰으로만 (주인·관리자는 여행 정보에, 보기 링크 손님은 링크에 있다)
  const calendarToken = viewToken ?? (canManage ? trip.view_token : undefined);
  const menu: HeaderMenuItem[] = [
    { key: "print", label: t("일정표 인쇄·PDF"), icon: Printer, onClick: () => window.print() },
    ...(calendarToken ? [{ key: "calendar", label: t("캘린더에 추가"), icon: CalendarPlus, onClick: () => setCalendarOpen(true) }] : []),
    ...(inApp || canCopy
      ? [{ key: "copy", label: inApp ? t("여행 복제") : t("내 여행으로 가져오기"), icon: Copy, onClick: () => setCopyOpen(true) }]
      : []),
    ...(canEdit ? [{ key: "cover", label: t("커버 사진 바꾸기"), icon: ImageIcon, onClick: () => setCoverOpen(true) }] : []),
    ...(inApp && access === "edit"
      ? [{ key: "leave", label: t("이 여행에서 나가기"), icon: LogOut, onClick: () => void leaveTrip(), danger: true }]
      : []),
  ];

  return (
    <div className={inApp ? "" : "min-h-dvh pb-16"}>
      <TripHeader
        trip={trip}
        tripId={tripId}
        inApp={inApp}
        mode={mode}
        access={access}
        onShare={inApp && canManage ? () => setShareOpen(true) : undefined}
        onActivity={() => setActivityOpen(true)}
        menu={menu}
      />

      {/* 탭 */}
      <div className="glass sticky top-0 z-30 border-b border-border-subtle md:top-16 print:hidden">
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 py-2 md:px-0 md:py-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-sm font-semibold transition-colors md:flex-none md:px-5 ${
                tab === id ? "text-on-ink" : "text-foreground/65 hover:text-foreground"
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

      <div className="mx-auto max-w-6xl px-4 pt-3 md:px-0 print:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {tab === "plan" && (
              <PlanTab
                tripId={tripId}
                trip={trip}
                points={points}
                legs={legs}
                savedRoutes={routeOptions}
                setLegs={setLegs}
                setRouteOptions={setRouteOptions}
                actions={actions}
                canEdit={canEdit}
                day={day}
                onDayChange={setDay}
                todayDay={todayDay}
                past={phase.phase === "past"}
                expenses={expenses}
                docs={docs}
              />
            )}

            {tab === "expenses" && (
              <ExpensesTab
                tripId={tripId}
                day={day}
                canEdit={canEdit}
                trip={trip}
                onPatchTrip={(patch) => void patchTrip(patch).catch(() => {})}
              />
            )}

            {tab === "record" && (
              <RecordTab
                trip={trip}
                points={points}
                legs={legs}
                expenses={expenses}
                canEdit={canEdit}
                onSavePoint={actions.savePoint}
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

      <PrintItinerary trip={trip} points={points} legs={legs} docs={docs} />

      {inApp && canManage && (
        <SharePanel open={shareOpen} onClose={() => setShareOpen(false)} trip={trip} isAdmin={access === "admin"} />
      )}
      <ActivitySheet tripId={tripId} open={activityOpen} onClose={() => setActivityOpen(false)} />
      <Sheet open={calendarOpen} onClose={() => setCalendarOpen(false)} title={t("캘린더에 추가")}>
        {calendarToken && <CalendarLinks viewToken={calendarToken} />}
      </Sheet>
      {(inApp || canCopy) && <CopyTripDialog trip={trip} open={copyOpen} onClose={() => setCopyOpen(false)} />}
      {canEdit && (
        <CoverPicker
          trip={trip}
          open={coverOpen}
          onClose={() => setCoverOpen(false)}
          onPick={(url) => patchTrip({ cover_image_url: url })}
        />
      )}
    </div>
  );
}
