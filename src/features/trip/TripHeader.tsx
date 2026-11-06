"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Eye, MapPin, MoreHorizontal, PencilLine, Share2, Users, type LucideIcon } from "lucide-react";
import type { Access, Trip } from "@/lib/types";
import { coverUrl } from "@/lib/api";
import { useSyncStatus, usePresence } from "@/lib/realtime";
import CoverPhoto from "@/features/ui/CoverPhoto";
import { ddayLabel, formatRange, stayLabel, tripPhase } from "@/features/ui/dates";
import PrefsToggle from "@/i18n/PrefsToggle";
import { usePrefs, useT } from "@/i18n/I18nProvider";
import { Avatar, uniqueViewers } from "./ActivitySheet";

export interface HeaderMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}

/**
 * 여행 사진 헤더. 사진 위 버튼은 뒤로·실시간(접속자)·공유·더보기 네 개만 두고,
 * 언어·통화·테마와 그 밖의 일(인쇄·복제·커버 바꾸기·나가기)은 더보기 메뉴로 모은다
 */
export default function TripHeader({
  trip,
  tripId,
  inApp,
  mode,
  access,
  onShare,
  onActivity,
  menu,
}: {
  trip: Trip;
  tripId: string;
  inApp: boolean;
  mode: Access;
  access: Access;
  /** 공유 창 (주인·관리자) */
  onShare?: () => void;
  /** 접속자·변경 기록 창 */
  onActivity: () => void;
  menu: HeaderMenuItem[];
}) {
  const { t, locale } = usePrefs();
  const phase = tripPhase(trip);
  const stay = stayLabel(trip, locale);

  return (
    // 더보기 메뉴가 헤더 밖으로 나와야 해서 잘라내기(overflow-hidden)는 사진 층에만 건다.
    // 메뉴가 열렸을 때만 z-[35]: 탭 바(z-30) 위로 메뉴가 뜬다. 평소엔 스크롤하면 헤더가 붙어 있는 탭 바 밑으로 지나가야 한다
    <header className="relative isolate has-[[aria-expanded=true]]:z-[35] bg-slate-300 text-white md:mx-auto md:mt-6 md:max-w-6xl md:rounded-[1.75rem] print:hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden md:rounded-[1.75rem]">
      <motion.div
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="absolute inset-0"
      >
        <CoverPhoto
          country={trip.country}
          continent={trip.continent}
          city={trip.region}
          title={trip.title}
          src={coverUrl(trip.cover_image_url)}
        />
      </motion.div>
      </div>
      <div className="flex min-h-44 flex-col justify-between gap-6 p-4 pt-[max(1rem,env(safe-area-inset-top))] md:min-h-72 md:p-8">
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
            <LiveBadge tripId={tripId} onClick={onActivity} />
            {onShare && (
              <button
                onClick={onShare}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-semibold text-foreground shadow-lift transition active:scale-95"
              >
                <Share2 size={15} /> {t("공유")}
              </button>
            )}
            <HeaderMenu items={menu}>
              {/* 로그인 화면의 데스크톱은 상단 바에 이미 있다 */}
              <div className={`${menu.length ? "mt-1.5 border-t border-border-subtle pt-1" : ""} ${inApp ? "md:hidden" : ""}`}>
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold text-foreground/60">{t("화면 설정")}</p>
                <PrefsToggle className="px-1.5 pb-1" />
              </div>
            </HeaderMenu>
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
          <h1 className="mt-2 text-[1.75rem] font-extrabold leading-tight tracking-tight md:text-5xl">{trip.title}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/88">
            <span>
              <MapPin size={14} className="-mt-0.5 inline" /> {[trip.country, trip.region].filter(Boolean).map((s) => t(s!)).join(" · ")}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={14} />
              {formatRange(trip, locale)}
              {stay && ` · ${stay}`}
            </span>
            {inApp && access === "edit" && (
              <span className="inline-flex items-center gap-1">
                <PencilLine size={13} />
                {trip.owner_username
                  ? t("{name}님의 여행 · 함께 편집", { name: trip.owner_username })
                  : t("초대받은 여행 · 함께 편집")}
              </span>
            )}
          </p>
        </div>
      </div>
    </header>
  );
}

/** 실시간 연결 상태 + 지금 같이 보는 사람. 누르면 변경 기록 */
function LiveBadge({ tripId, onClick }: { tripId: string; onClick: () => void }) {
  const t = useT();
  const status = useSyncStatus(tripId);
  const others = uniqueViewers(usePresence(tripId));
  const meta = {
    live: { dot: "bg-mint", label: "실시간 반영 중" },
    polling: { dot: "bg-amber-400", label: "몇 초마다 반영" },
    connecting: { dot: "bg-white/70 animate-pulse", label: "연결 중" },
    offline: { dot: "bg-accent", label: "연결 끊김" },
  }[status];
  return (
    <button
      type="button"
      onClick={onClick}
      title={t(meta.label)}
      aria-label={`${t(meta.label)} · ${t("함께 보기")}`}
      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-black/25 pl-3 pr-3 text-[11px] font-semibold backdrop-blur-md transition hover:bg-black/40"
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      <Users size={14} aria-hidden className="sm:hidden" />
      {others.length > 0 ? (
        <span className="flex -space-x-1.5">
          {others.slice(0, 3).map((v) => (
            <Avatar key={v.id} name={v.name} size={22} ring="ring-black/30" />
          ))}
          {others.length > 3 && (
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/40 text-[10px] ring-2 ring-black/30">
              +{others.length - 3}
            </span>
          )}
        </span>
      ) : (
        <span className="hidden sm:inline">{t(meta.label)}</span>
      )}
    </button>
  );
}

/** 더보기 메뉴: 바깥을 누르거나 Esc 면 닫힌다 */
function HeaderMenu({ items, children }: { items: HeaderMenuItem[]; children: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("더보기")}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 backdrop-blur-md transition hover:bg-black/40"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-2xl border border-border-subtle bg-surface py-1.5 text-foreground shadow-lift"
        >
          {items.map(({ key, label, icon: Icon, onClick, danger }) => (
            <button
              key={key}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold transition hover:bg-surface-muted ${
                danger ? "text-accent" : ""
              }`}
            >
              <Icon size={16} aria-hidden className={danger ? "" : "text-foreground/60"} />
              {label}
            </button>
          ))}
          {children}
        </div>
      )}
    </div>
  );
}

