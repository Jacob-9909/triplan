"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ExternalLink,
  Loader2,
  Plane,
  Search,
  Users,
} from "lucide-react";
import type { FlightsApiResponse, FlightOffer } from "./types";
import IataInput from "./IataInput";
import SearchCard, {
  primaryButtonClass,
  searchCardClass,
  searchInputClass,
} from "./SearchCard";
import { formatDuration, formatKrw, isoToHm } from "./format";

export interface FlightDefaultValues {
  origin?: string; // IATA 코드
  destination?: string;
  date?: string; // YYYY-MM-DD
  adults?: number;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

/** 항공사 코드 → 이니셜 배지 색상 (토큰 팔레트 순환) */
const BADGE_COLORS = [
  "bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]",
  "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
  "bg-[var(--surface-muted)] text-[var(--color-mint)]",
  "bg-[var(--surface-muted)] text-[var(--color-violet)]",
];

function AirlineBadge({ offer }: { offer: FlightOffer }) {
  const initial = (offer.airlineName ?? offer.airline ?? "?").slice(0, 1).toUpperCase();
  const color =
    BADGE_COLORS[(offer.airline.charCodeAt(0) || 0) % BADGE_COLORS.length];
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${color}`}
      title={offer.airlineName ?? offer.airline}
    >
      {initial}
    </span>
  );
}

function FlightOfferRow({ offer }: { offer: FlightOffer }) {
  return (
    <SearchCard className="fade-up flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <AirlineBadge offer={offer} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {offer.airlineName ?? offer.airline}
          </p>
          <p className="text-xs text-[var(--foreground)]/50 tabular-nums">
            {isoToHm(offer.departAt)} → {isoToHm(offer.arriveAt)} ·{" "}
            {formatDuration(offer.durationMinutes)}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            offer.stops === 0
              ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]"
              : "bg-[var(--surface-muted)] text-[var(--foreground)]/60"
          }`}
        >
          {offer.stops === 0 ? "직항" : `경유 ${offer.stops}회`}
        </span>
        <div className="text-right">
          <p className="text-base font-bold text-[var(--color-primary-strong)] tabular-nums">
            {formatKrw(offer.price, offer.currency)}
          </p>
          <a
            href={offer.deepLink ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--foreground)]/50 transition hover:text-[var(--color-primary)]"
          >
            예매하러 가기 <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </SearchCard>
  );
}

function LinkModeCards({ links }: { links: FlightsApiResponse & { mode: "links" } }) {
  return (
    <>
      <motion.p {...fadeUp} className="mb-3 text-xs text-[var(--foreground)]/60">
        실시간 검색이 일시적으로 불가하여 예매 사이트로 안내합니다.
      </motion.p>
      <div className="grid gap-3 sm:grid-cols-3">
        {links.links.map((link) => (
          <a key={link.provider} href={link.url} target="_blank" rel="noreferrer" {...fadeUp}>
            <SearchCard className="h-full transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]">
              <p className="text-sm font-bold text-[var(--color-primary-strong)]">
                {link.provider}
              </p>
              <p className="mt-1 text-xs text-[var(--foreground)]/60">{link.label}</p>
              {link.description && (
                <p className="mt-1 text-[11px] text-[var(--foreground)]/40">{link.description}</p>
              )}
              <ExternalLink size={14} className="mt-3 text-[var(--foreground)]/30" />
            </SearchCard>
          </a>
        ))}
      </div>
    </>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function Skeleton() {
  return (
    <div className={`space-y-3 ${searchCardClass}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
          className="h-16 rounded-xl bg-[var(--surface-muted)]"
        />
      ))}
    </div>
  );
}

export default function FlightSearchPanel({
  defaultValues,
}: {
  defaultValues?: FlightDefaultValues;
}) {
  const [origin, setOrigin] = useState(defaultValues?.origin ?? "");
  const [destination, setDestination] = useState(defaultValues?.destination ?? "");
  const [date, setDate] = useState(defaultValues?.date && defaultValues.date >= todayStr()
    ? defaultValues.date
    : todayStr());
  const [adults, setAdults] = useState(String(defaultValues?.adults ?? 1));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FlightsApiResponse | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
      setError("출발/도착 도시를 목록에서 선택해 주세요");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search/flights?origin=${origin}&destination=${destination}&date=${date}&adults=${adults}&currency=KRW`,
      );
      if (!res.ok) throw new Error();
      setResult((await res.json()) as FlightsApiResponse);
    } catch {
      setError("검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 검색 폼 */}
      <form onSubmit={handleSearch} className={searchCardClass}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <IataInput label="출발지" value={origin} onChange={setOrigin} placeholder="예: 인천, ICN" />
          <IataInput label="도착지" value={destination} onChange={setDestination} />
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]/60">
              <CalendarDays size={13} className="text-[var(--color-primary)]" /> 출발일
            </label>
            <input
              type="date"
              min={todayStr()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={searchInputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]/60">
              <Users size={13} className="text-[var(--color-primary)]" /> 인원
            </label>
            <select
              value={adults}
              onChange={(e) => setAdults(e.target.value)}
              className={searchInputClass}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  성인 {n}명
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={loading} className={`${primaryButtonClass} self-end`}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? "검색 중..." : "항공권 검색"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs font-medium text-[var(--color-accent)]">{error}</p>}
      </form>

      {/* 결과 영역: 스켈레톤 → 결과 애니메이션 */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" exit={{ opacity: 0 }}>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]/70">
              <Plane size={16} className="text-[var(--color-primary)]" /> 검색 중...
            </p>
            <Skeleton />
          </motion.div>
        ) : result ? (
          result.mode === "offers" ? (
            result.offers.length ? (
              <div key="offers" className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                <AnimatePresence initial={false}>
                  {result.offers.map((offer) => (
                    <motion.div
                      key={offer.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <FlightOfferRow offer={offer} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <SearchCard key="empty" className="fade-up text-center text-sm text-[var(--foreground)]/60">
                <Search size={20} className="mx-auto mb-2 text-[var(--foreground)]/30" />
                조건에 맞는 항공권이 없습니다. 날짜를 바꿔 시도해 보세요.
              </SearchCard>
            )
          ) : (
            <div key="links">
              <LinkModeCards links={result} />
            </div>
          )
        ) : null}
      </AnimatePresence>
    </div>
  );
}
