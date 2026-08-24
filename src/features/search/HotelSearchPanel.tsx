"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BedDouble,
  CalendarDays,
  ExternalLink,
  Loader2,
  Search as SearchIcon,
  Star,
  Users,
} from "lucide-react";
import type { HotelOffer, HotelsApiResponse } from "./types";
import SearchCard, {
  primaryButtonClass,
  searchCardClass,
  searchInputClass,
} from "./SearchCard";
import { formatKrw } from "./format";

export interface HotelDefaultValues {
  cityCode?: string; // IATA 도시 코드 (예: NRT)
  lat?: number;
  lng?: number;
  checkIn?: string; // YYYY-MM-DD
  checkOut?: string;
  guests?: number;
}

const addDays = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const todayStr = () => new Date().toISOString().slice(0, 10);

function HotelOfferRow({ offer }: { offer: HotelOffer }) {
  return (
    <SearchCard className="fade-up flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <BedDouble size={17} />
          </span>
          <p className="truncate text-sm font-semibold">{offer.name}</p>
        </div>
        <div className="mt-1.5 flex items-center gap-2 pl-11">
          {offer.rating != null && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--color-sand)]">
              <Star size={11} fill="currentColor" /> {offer.rating}
            </span>
          )}
          {offer.score != null && (
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-primary-strong)] tabular-nums">
              {offer.score.toFixed(1)}
            </span>
          )}
          {offer.roomDesc && (
            <p className="truncate text-xs text-[var(--foreground)]/50">{offer.roomDesc}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 pl-11 sm:justify-end sm:pl-0">
        <div className="text-right">
          <p className="text-base font-bold text-[var(--color-primary-strong)] tabular-nums">
            {offer.totalPrice != null
              ? `${formatKrw(offer.totalPrice, offer.currency)}`
              : "요금 문의"}
          </p>
          <p className="text-[11px] text-[var(--foreground)]/40">숙박 총액</p>
        </div>
        <a
          href={offer.deepLink ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--color-primary-strong)] transition hover:bg-[var(--color-primary-soft)]"
        >
          보기 <ExternalLink size={12} />
        </a>
      </div>
    </SearchCard>
  );
}

function LinkModeCards({ links }: { links: HotelsApiResponse & { mode: "links" } }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {links.links.map((link) => (
        <a key={link.provider} href={link.url} target="_blank" rel="noreferrer" {...motionFadeUp}>
          <SearchCard className="h-full transition hover:-translate-y-0.5 hover:border-[var(--color-accent)]">
            <p className="text-sm font-bold text-[var(--color-accent)]">{link.provider}</p>
            <p className="mt-1 text-xs text-[var(--foreground)]/60">{link.label}</p>
            {link.description && (
              <p className="mt-1 text-[11px] text-[var(--foreground)]/40">{link.description}</p>
            )}
            <ExternalLink size={14} className="mt-3 text-[var(--foreground)]/30" />
          </SearchCard>
        </a>
      ))}
    </div>
  );
}

const motionFadeUp = {
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
          className="h-20 rounded-xl bg-[var(--surface-muted)]"
        />
      ))}
    </div>
  );
}

export default function HotelSearchPanel({
  defaultValues,
}: {
  defaultValues?: HotelDefaultValues;
}) {
  const [checkIn, setCheckIn] = useState(
    defaultValues?.checkIn && defaultValues.checkIn >= todayStr()
      ? defaultValues.checkIn
      : todayStr(),
  );
  const [checkOut, setCheckOut] = useState(
    defaultValues?.checkOut && defaultValues.checkOut > checkIn
      ? defaultValues.checkOut
      : addDays(checkIn, 1),
  );
  const [guests, setGuests] = useState(String(defaultValues?.guests ?? 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HotelsApiResponse | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!defaultValues?.cityCode && !(defaultValues?.lat != null && defaultValues?.lng != null)) {
      setError("여행 지역을 먼저 설정하거나 도시 코드를 확인해 주세요");
      return;
    }
    if (checkOut <= checkIn) {
      setError("체크아웃은 체크인 이후여야 합니다");
      return;
    }
    setLoading(true);
    const qs = new URLSearchParams({
      checkIn,
      checkOut,
      guests,
      currency: "KRW",
    });
    if (defaultValues?.cityCode) qs.set("cityCode", defaultValues.cityCode);
    else {
      qs.set("lat", String(defaultValues?.lat));
      qs.set("lng", String(defaultValues?.lng));
    }
    try {
      const res = await fetch(`/api/search/hotels?${qs}`);
      if (!res.ok) throw new Error();
      setResult((await res.json()) as HotelsApiResponse);
    } catch {
      setError("검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const locationLabel =
    defaultValues?.cityCode ??
    (defaultValues?.lat != null && defaultValues?.lng != null ? "선택한 좌표" : "");

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className={searchCardClass}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]/60">
              <BedDouble size={13} className="text-[var(--color-accent)]" /> 지역
            </label>
            <input
              readOnly
              value={locationLabel || "지역 미설정"}
              className={`${searchInputClass} cursor-default font-semibold`}
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]/60">
              <CalendarDays size={13} className="text-[var(--color-accent)]" /> 체크인
            </label>
            <input
              type="date"
              min={todayStr()}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className={searchInputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]/60">
              <CalendarDays size={13} className="text-[var(--color-accent)]" /> 체크아웃
            </label>
            <input
              type="date"
              min={addDays(checkIn, 1)}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className={searchInputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]/60">
              <Users size={13} className="text-[var(--color-accent)]" /> 인원
            </label>
            <select
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className={searchInputClass}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  {n}명
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading} className={`${primaryButtonClass} mt-3 w-full`}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <SearchIcon size={16} />}
          {loading ? "검색 중..." : "숙소 검색"}
        </button>
        {error && <p className="mt-2 text-xs font-medium text-[var(--color-accent)]">{error}</p>}
      </form>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" exit={{ opacity: 0 }}>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]/70">
              <Loader2 size={16} className="animate-spin text-[var(--color-accent)]" /> 검색 중...
            </p>
            <Skeleton />
          </motion.div>
        ) : result ? (
          result.mode === "offers" ? (
            result.offers.length ? (
              <div key="offers" className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {result.offers.map((offer) => (
                  <HotelOfferRow key={offer.id} offer={offer} />
                ))}
              </div>
            ) : (
              <SearchCard key="empty" className="fade-up text-center text-sm text-[var(--foreground)]/60">
                <SearchIcon size={20} className="mx-auto mb-2 text-[var(--foreground)]/30" />
                조건에 맞는 숙소가 없습니다. 날짜나 인원을 바꿔 시도해 보세요.
              </SearchCard>
            )
          ) : (
            <div key="links">
              <p className="mb-3 text-xs text-[var(--foreground)]/60">
                실시간 검색이 일시적으로 불가하여 예매 사이트로 안내합니다.
              </p>
              <LinkModeCards links={result} />
            </div>
          )
        ) : null}
      </AnimatePresence>
    </div>
  );
}
