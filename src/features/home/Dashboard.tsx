"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, ChevronRight, Heart, MapPin, Plane, Plus } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Trip, WishlistPlace } from "@/lib/types";
import CoverPhoto from "@/features/ui/CoverPhoto";
import CountUp from "@/features/ui/CountUp";
import TripCard from "@/features/trip/TripCard";
import { formatRange, stayLabel, tripPhase } from "@/features/ui/dates";
import { usePrefs, useT } from "@/i18n/I18nProvider";

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "늦은 밤에도 여행 생각 중이시네요";
  if (h < 12) return "좋은 아침이에요";
  if (h < 18) return "오늘은 어디로 떠나 볼까요";
  return "오늘 하루도 수고했어요";
}

export default function Dashboard() {
  const t = useT();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [wishes, setWishes] = useState<WishlistPlace[]>([]);

  useEffect(() => {
    apiGet<Trip[]>("/api/trips").then(setTrips).catch(() => setTrips([]));
    apiGet<WishlistPlace[]>("/api/wishlist").then(setWishes).catch(() => setWishes([]));
  }, []);

  const { next, upcoming, past } = useMemo(() => {
    const list = trips ?? [];
    const active = list
      .filter((t) => ["upcoming", "ongoing", "undated"].includes(tripPhase(t).phase))
      .sort((a, b) => (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999"));
    const done = list
      .filter((t) => tripPhase(t).phase === "past")
      .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
    const nextTrip = active.find((t) => t.start_date) ?? null;
    return { next: nextTrip, upcoming: active.filter((t) => t !== nextTrip), past: done };
  }, [trips]);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6">
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-sm font-medium text-foreground/68 md:mt-8"
      >
        {t(greeting())}
      </motion.p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t("내 여행")}</h1>
        {trips !== null && trips.length > 0 && (
          <dl className="flex gap-4 text-sm md:gap-6">
            {[
              ["계획 중", next ? upcoming.length + 1 : upcoming.length],
              ["다녀옴", past.length],
              ["가고 싶은 곳", wishes.length],
            ].map(([label, n]) => (
              <div key={label} className="flex items-baseline gap-1.5">
                <dt className="text-foreground/68">{t(String(label))}</dt>
                <dd className="font-mono text-base font-bold tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* 다음 여행 */}
      <section className="mt-5">
        {trips === null ? (
          <div className="skeleton h-72 rounded-[1.75rem] md:h-96" />
        ) : next ? (
          <NextTripHero trip={next} />
        ) : (
          <EmptyHero />
        )}
      </section>

      {/* 넓은 화면: 왼쪽 계획 중인 여행, 오른쪽 가고 싶은 곳 */}
      <div className={upcoming.length > 0 ? "lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-10" : ""}>
      {/* 다가오는 여행 */}
      {upcoming.length > 0 && (
        <Section title={t("계획 중인 여행")} count={upcoming.length}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((t, i) => (
              <TripCard key={t.id} trip={t} index={i} />
            ))}
          </div>
        </Section>
      )}

      {/* 가고 싶은 곳 미리보기 */}
      <Section
        title={t("언젠가 가고 싶은 곳")}
        count={wishes.length}
        action={
          <Link href="/wishlist" className="-my-2 flex items-center gap-0.5 py-2 text-sm font-semibold text-primary-strong">
            {t("전체 보기")} <ChevronRight size={16} />
          </Link>
        }
      >
        {wishes.length === 0 ? (
          <Link
            href="/wishlist"
            className="card card-lift flex items-center gap-4 p-5 text-sm text-foreground/72"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
              <Heart size={20} />
            </span>
            {t("아직 저장한 곳이 없어요. 언젠가 가 보고 싶은 곳을 하나 담아 보세요.")}
            <ArrowRight size={16} className="ml-auto shrink-0" />
          </Link>
        ) : (
          <div
            className={`no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0 ${
              upcoming.length > 0 ? "lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0" : ""
            }`}
          >
            {wishes.slice(0, upcoming.length > 0 ? 6 : 10).map((w, i) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="snap-start"
              >
                <Link
                  href="/wishlist"
                  className={`card-lift group relative block h-40 w-36 overflow-hidden rounded-2xl bg-surface-muted shadow-card ${
                    upcoming.length > 0 ? "lg:h-44 lg:w-auto" : ""
                  }`}
                >
                  <CoverPhoto country={w.country} continent={w.continent} city={w.region} title={w.name} zoomOnHover />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                                        <p className="mt-1 truncate text-sm font-bold">{t(w.name)}</p>
                    <p className="truncate text-[11px] text-white/82">{w.country && t(w.country)}</p>
                  </div>
                  {w.trip_id && (
                    <span className="absolute right-2 top-2 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-white">
                      {t("계획 중")}
                    </span>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      </div>

      {/* 다녀온 여행 */}
      {past.length > 0 && (
        <Section title={t("다녀온 여행")} count={past.length}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {past.map((t, i) => (
              <TripCard key={t.id} trip={t} index={i} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-bold tracking-tight">
          {title}
          {count !== undefined && count > 0 && (
            <span className="ml-1.5 text-sm font-semibold text-foreground/68">{count}</span>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function NextTripHero({ trip }: { trip: Trip }) {
  const { t, locale } = usePrefs();
  const p = tripPhase(trip);
  const stay = stayLabel(trip, locale);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Link
        href={`/trips/${trip.id}`}
        className="group relative block h-72 overflow-hidden rounded-[1.75rem] bg-slate-300 shadow-lift md:h-96"
      >
        <CoverPhoto country={trip.country} continent={trip.continent} city={trip.region} title={trip.title} zoomOnHover />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-slate-950/15 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-between p-6 text-white md:p-9">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
            <Plane size={16} />
            {p.phase === "ongoing" ? t("지금 여행 중") : t("다음 여행")}
          </div>
          <div>
            <div className="flex items-end gap-3">
              {p.phase === "upcoming" ? (
                <p className="font-display text-6xl font-extrabold leading-none tracking-tighter md:text-8xl">
                  D-<CountUp value={p.dday ?? 0} />
                </p>
              ) : (
                <p className="font-display text-5xl font-extrabold leading-none tracking-tighter md:text-7xl">
                  Day {p.dayIndex}
                </p>
              )}
            </div>
            <p className="mt-4 text-sm font-semibold text-white/88">
              <MapPin size={14} className="inline -mt-0.5" /> {[trip.country, trip.region].filter(Boolean).map((s) => t(s!)).join(" · ")}
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight md:text-4xl">{trip.title}</h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
              <CalendarDays size={14} /> {formatRange(trip, locale)} {stay && `· ${stay}`}
            </p>
          </div>
        </div>
        <span className="absolute bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-foreground shadow-lift transition-transform group-hover:translate-x-1 md:bottom-9 md:right-9">
          <ArrowRight size={20} />
        </span>
      </Link>
    </motion.div>
  );
}

function EmptyHero() {
  const t = useT();
  return (
    <div className="relative flex h-72 flex-col items-start justify-end overflow-hidden rounded-[1.75rem] bg-ink p-6 text-white shadow-lift md:h-80 md:p-9">
      <div aria-hidden className="topo absolute inset-0 opacity-60 invert" />
      <motion.div
        aria-hidden
        className="absolute -right-6 top-6 text-white/15"
        animate={{ x: [0, 18, 0], y: [0, -10, 0], rotate: [0, 6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <Plane size={180} strokeWidth={1.2} />
      </motion.div>
      <h2 className="relative text-2xl font-extrabold tracking-tight md:text-3xl">{t("첫 여행을 계획해 볼까요?")}</h2>
      <p className="relative mt-2 max-w-sm text-sm text-white/80">
        {t("목적지와 날짜만 정하면 지도·일정·가계부·준비물이 준비돼요.")}
      </p>
      <Link href="/trips/new" className="btn btn-primary relative mt-5 px-5 py-3 text-sm">
        <Plus size={16} /> {t("새 여행 만들기")}
      </Link>
    </div>
  );
}
