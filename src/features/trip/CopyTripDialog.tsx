"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { CalendarDays, CopyPlus, Loader2 } from "lucide-react";
import type { Trip } from "@/lib/types";
import { apiPost } from "@/lib/api";
import Sheet from "@/features/ui/Sheet";
import { usePrefs, useT } from "@/i18n/I18nProvider";

/**
 * 여행 복제 / 내 여행으로 가져오기. 새 시작일을 고르면 원래 여행 길이만큼 끝나는 날을 맞춘다.
 * 서버(POST /api/trips/[id]/copy)와 같은 규칙으로 끝나는 날을 미리 보여 준다.
 */
export default function CopyTripDialog({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t("여행 복제")}>
      {/* 열 때마다 처음 값으로: 닫힌 동안엔 폼을 그리지 않는다 */}
      {open && <CopyForm trip={trip} />}
    </Sheet>
  );
}

function CopyForm({ trip }: { trip: Trip }) {
  const { t, df } = usePrefs();
  const router = useRouter();
  const [title, setTitle] = useState(() => t("{title} (복사본)", { title: trip.title }));
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 날짜가 있던 여행만 끝나는 날을 미리 알 수 있다 (날짜 없던 여행은 서버가 마지막 Day 로 맞춘다)
  const span =
    trip.start_date && trip.end_date
      ? Math.max(0, differenceInCalendarDays(parseISO(trip.end_date), parseISO(trip.start_date)))
      : trip.start_date
        ? 0
        : null;
  const endDate = startDate && span !== null ? addDays(parseISO(startDate), span) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!title.trim()) return setError(t("여행 제목을 입력해 주세요."));
    setSaving(true);
    setError(null);
    try {
      const copy = await apiPost<Trip>(`/api/trips/${trip.id}/copy`, { title: title.trim(), start_date: startDate || null });
      router.push(`/trips/${copy.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("여행을 복사하지 못했어요."));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="copy-title">
        {t("여행 이름")}
      </label>
      <input id="copy-title" value={title} onChange={(e) => setTitle(e.target.value)} className="input" />

      <label className="field-label mt-4" htmlFor="copy-start">
        {t("가는 날")} <span className="font-normal text-foreground/65">{t("(선택)")}</span>
      </label>
      <input
        id="copy-start"
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="input"
      />
      <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground/72">
        <CalendarDays size={14} className="shrink-0" />
        {!startDate
          ? t("날짜는 나중에 정해도 돼요.")
          : endDate
            ? t("{date}에 돌아와요", { date: format(endDate, t("yyyy. M. d (E)"), { locale: df }) })
            : t("끝나는 날은 장소를 넣은 마지막 Day 에 맞춰요.")}
      </p>

      <p className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-xs leading-relaxed text-foreground/72">
        {t("장소·순서·이동 구간·준비물 목록을 복사해요. 가계부·예약·사진·평점은 복사하지 않아요.")}
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-accent">
          {error}
        </p>
      )}

      <button type="submit" disabled={saving} className="btn btn-primary mt-5 w-full py-3">
        {saving ? <Loader2 size={17} className="animate-spin" /> : <CopyPlus size={17} />}
        {t("복사해서 열기")}
      </button>
    </form>
  );
}
