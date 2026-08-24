"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Loader2, MapPin, Plane } from "lucide-react";
import type { Trip } from "@/lib/types";
import { apiPost } from "@/lib/api";
import type { DestinationSelection } from "@/data/world";
import CountryBackdrop from "@/features/ui/CountryBackdrop";

interface TripCreateFormProps {
  selection: DestinationSelection;
  /** 여행 생성 성공 시 (insert된 trip 반환) */
  onSuccess?: (trip: Trip) => void;
  /** 다시 목적지를 고르러 갈 때 */
  onCancel?: () => void;
}

function diffNights(start: string, end: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const d = Math.round((e.getTime() - s.getTime()) / 86_400_000);
  return d >= 0 ? d : null;
}

export default function TripCreateForm({ selection, onSuccess, onCancel }: TripCreateFormProps) {
  const { continent, country, city } = selection;
  const [title, setTitle] = useState(`${city.name} ${country.name} 여행`);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nights = useMemo(() => diffNights(startDate, endDate), [startDate, endDate]);
  const invalidRange = nights !== null && nights < 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("여행 제목을 입력해주세요.");
    if (!startDate || !endDate) return setError("시작일과 종료일을 모두 선택해주세요.");
    if (invalidRange) return setError("종료일이 시작일보다 빠를 수 없어요.");

    setLoading(true);
    try {
      const data = await apiPost<Trip>("/api/trips", {
        title: title.trim(),
        continent: continent.name,
        country: country.name,
        region: city.name,
        start_date: startDate,
        end_date: endDate,
        base_currency: country.currency,
      });
      onSuccess?.(data as Trip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "여행 생성에 실패했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="card relative isolate mx-auto w-full max-w-xl overflow-hidden p-6 sm:p-8 lg:max-w-2xl lg:p-10"
    >
      <CountryBackdrop country={country.name} continent={continent.id} />
      {/* 선택 요약 */}
      <div className="flex items-center gap-4 rounded-2xl bg-[color:var(--surface-muted)] p-4">
        <span className="text-4xl drop-shadow-sm">{city.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 font-semibold">
            <MapPin size={14} className="text-[color:var(--color-accent)]" />
            {city.name} · {country.flag} {country.name}
          </p>
          <p className="text-xs text-slate-400 truncate">
            {continent.emoji} {continent.name} · 현지 화폐{" "}
            <span className="font-mono font-semibold text-[color:var(--color-primary-strong)]">
              {country.currency}
            </span>{" "}
            · {city.description}
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="목적지 다시 선택"
            className="shrink-0 rounded-full border border-[color:var(--border)] bg-white p-2 text-slate-500 hover:text-[color:var(--color-primary-strong)]"
          >
            <ArrowLeft size={16} />
          </button>
        )}
      </div>

      {/* 제목 */}
      <label className="mt-6 block text-sm font-semibold" htmlFor="trip-title">
        ✈️ 여행 제목
      </label>
      <input
        id="trip-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="예: 도쿄 맛집 투어 3박 4일"
        className="card mt-1.5 w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-slate-300 focus:border-[color:var(--color-primary)]"
      />

      {/* 날짜 */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="trip-start" className="block text-sm font-semibold">
            🗓️ 시작일
          </label>
          <input
            id="trip-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="card mt-1.5 w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[color:var(--color-primary)]"
          />
        </div>
        <div>
          <label htmlFor="trip-end" className="block text-sm font-semibold">
            🗓️ 종료일
          </label>
          <input
            id="trip-end"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="card mt-1.5 w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[color:var(--color-primary)]"
          />
        </div>
      </div>

      {nights !== null && !invalidRange && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays size={13} className="text-[color:var(--color-mint)]" />
          총 {nights}박 {nights + 1}일 일정이에요
        </p>
      )}

      {/* 에러 */}
      {(error || invalidRange) && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-[color:var(--color-accent-soft)] px-4 py-2.5 text-sm text-[#be123c]"
        >
          {error ?? "종료일이 시작일보다 빠를 수 없어요."}
        </p>
      )}

      {/* 제출 */}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--color-primary)] py-3.5 font-semibold text-white shadow-md shadow-sky-200 transition hover:bg-[color:var(--color-primary-strong)] disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            만들고 있어요...
          </>
        ) : (
          <>
            <Plane size={18} />
            이 여행 시작하기
          </>
        )}
      </button>
    </motion.form>
  );
}
