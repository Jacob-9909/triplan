"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Loader2, Plane } from "lucide-react";
import type { Trip } from "@/lib/types";
import { apiPost } from "@/lib/api";
import type { DestinationSelection } from "@/data/world";
import CoverPhoto from "@/features/ui/CoverPhoto";

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
  return Math.round((e.getTime() - s.getTime()) / 86_400_000);
}

export default function TripCreateForm({ selection, onSuccess, onCancel }: TripCreateFormProps) {
  const { continent, country, city } = selection;
  const [title, setTitle] = useState(`${city.name} 여행`);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nights = useMemo(() => diffNights(startDate, endDate), [startDate, endDate]);
  const invalidRange = nights !== null && nights < 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("여행 제목을 입력해 주세요.");
    if (!startDate || !endDate) return setError("시작일과 종료일을 모두 골라 주세요.");
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
      onSuccess?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "여행을 만들지 못했어요. 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      onSubmit={handleSubmit}
      className="card mx-auto w-full max-w-xl overflow-hidden"
    >
      {/* 목적지 사진 헤더 */}
      <div className="relative h-48 bg-slate-200 text-white md:h-56">
        <CoverPhoto country={country.name} continent={continent.name} />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="목적지 다시 고르기"
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-md transition hover:bg-black/45"
          >
            <ArrowLeft size={17} />
          </button>
        )}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-sm font-semibold text-white/80">
            {country.flag} {country.name} · {continent.name}
          </p>
          <p className="mt-0.5 text-3xl font-extrabold tracking-tight">
            {city.emoji} {city.name}
          </p>
          <p className="mt-1 text-xs text-white/70">
            {city.description} · 현지 화폐 <span className="font-mono font-semibold">{country.currency}</span>
          </p>
        </div>
      </div>

      <div className="p-5 md:p-7">
        <label className="block text-sm font-semibold" htmlFor="trip-title">
          여행 이름
        </label>
        <input
          id="trip-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 도쿄 맛집 투어"
          className="input mt-1.5"
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="trip-start" className="block text-sm font-semibold">
              가는 날
            </label>
            <input
              id="trip-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="trip-end" className="block text-sm font-semibold">
              오는 날
            </label>
            <input
              id="trip-end"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="input mt-1.5"
            />
          </div>
        </div>

        {nights !== null && !invalidRange && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary-strong"
          >
            <CalendarDays size={14} />
            {nights === 0 ? "당일치기 여행이에요" : `${nights}박 ${nights + 1}일 여행이에요`}
          </motion.p>
        )}

        {(error || invalidRange) && (
          <p role="alert" className="mt-4 rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-[#c2410c]">
            {error ?? "종료일이 시작일보다 빠를 수 없어요."}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary mt-6 w-full py-3.5 disabled:opacity-60">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> 만드는 중…
            </>
          ) : (
            <>
              <Plane size={18} /> 여행 시작하기
            </>
          )}
        </button>
      </div>
    </motion.form>
  );
}
