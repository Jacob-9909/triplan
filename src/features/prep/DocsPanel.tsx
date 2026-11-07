"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  differenceInCalendarDays,
  format,
  isWithinInterval,
  parseISO,
} from "date-fns";
import {
  CalendarDays,
  ExternalLink,
  FileText,
  Hotel,
  IdCard,
  Loader2,
  Plane,
  Plus,
  ShieldCheck,
  Sparkles,
  Stamp,
  Ticket,
  Trash2,
} from "lucide-react";
import type { TravelDoc } from "@/lib/types";
import { apiPost } from "@/lib/api";
import { usePrefs, useT } from "@/i18n/I18nProvider";
import { useTravelDocs } from "./useTravelDocs";

export const DOC_META: Record<
  TravelDoc["type"],
  { label: string; icon: typeof IdCard; bg: string; text: string }
> = {
  passport: {
    label: "여권",
    icon: IdCard,
    bg: "bg-[var(--color-primary-soft)]",
    text: "text-[var(--color-primary-strong)]",
  },
  visa: {
    label: "비자",
    icon: Stamp,
    bg: "bg-[var(--color-violet)]/15",
    text: "text-violet-500",
  },
  flight: {
    label: "항공권",
    icon: Plane,
    bg: "bg-sky-100",
    text: "text-sky-600",
  },
  hotel: {
    label: "숙소",
    icon: Hotel,
    bg: "bg-[var(--color-accent-soft)]",
    text: "text-[var(--color-accent)]",
  },
  ticket: {
    label: "티켓",
    icon: Ticket,
    bg: "bg-[var(--color-sand)]/20",
    text: "text-amber-500",
  },
  insurance: {
    label: "보험",
    icon: ShieldCheck,
    bg: "bg-teal-soft",
    text: "text-mint",
  },
  etc: {
    label: "기타",
    icon: FileText,
    bg: "bg-slate-100",
    text: "text-slate-600",
  },
};

const EMPTY_FORM = {
  type: "flight" as TravelDoc["type"],
  title: "",
  provider: "",
  confirmation_code: "",
  url: "",
  starts_at: "",
  ends_at: "",
};

/** 링크는 http(s)만 연다 (공유 편집자가 javascript: 등을 넣는 것 방지) */
export function safeUrl(url: string | null) {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

export default function DocsPanel({
  tripId,
  readOnly = false,
}: {
  tripId: string;
  /** 보기 전용 링크: 등록·삭제 UI 숨김 (예약번호는 서버에서 이미 제거됨) */
  readOnly?: boolean;
}) {
  const tr = useT();
  const { docs, loading, addDoc, removeDoc } = useTravelDocs(tripId);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  /** 입력 칸은 "예약 추가"를 눌렀을 때만 펼친다 (늘 펼쳐 두면 칸 일곱 개가 목록보다 먼저 보였다) */
  const [adding, setAdding] = useState(false);
  const { locale } = usePrefs();
  // 예약 확인 메일 붙여 넣기 → AI 가 읽어 아래 칸을 채운다 (저장은 사람이 확인하고)
  const [paste, setPaste] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  async function readPaste() {
    if (!paste) return;
    setParsing(true);
    setParseError(null);
    try {
      const b = await apiPost<Omit<typeof EMPTY_FORM, "url">>("/api/ai/parse-booking", { trip_id: tripId, text: paste, locale });
      setForm({ ...EMPTY_FORM, ...b });
      setPaste(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : tr("AI 가 메일을 읽지 못했어요. 잠시 뒤 다시 해 보세요."));
    } finally {
      setParsing(false);
    }
  }

  const setField =
    (key: keyof typeof EMPTY_FORM) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    await addDoc({
      type: form.type,
      title: form.title.trim(),
      provider: form.provider.trim() || null,
      confirmation_code: form.confirmation_code.trim() || null,
      url: form.url.trim() || null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    });
    setForm((prev) => ({ ...EMPTY_FORM, type: prev.type }));
    setSaving(false);
    setAdding(false);
  };

  return (
    <section className="card fade-up p-6 lg:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <Ticket size={18} />
          </span>
          {tr("여행 문서 보관함")}
        </h2>
        {!readOnly && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="btn btn-ghost shrink-0 px-3.5 text-sm">
            <Plus size={15} aria-hidden /> {tr("예약 추가")}
          </button>
        )}
      </div>

      {!readOnly && adding && (
        <div className="mt-4">
          {paste === null ? (
            <button type="button" onClick={() => setPaste("")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary-strong)]">
              <Sparkles size={15} aria-hidden /> {tr("확인 메일 붙여 넣어 채우기")}
            </button>
          ) : (
            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-surface p-3">
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value.slice(0, 6000))}
                rows={4}
                aria-label={tr("예약 확인 메일 내용")}
                placeholder={tr("항공·숙소·티켓 예약 확인 메일 내용을 붙여 넣으세요")}
                className="input resize-none text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void readPaste()}
                  disabled={parsing || paste.trim().length < 10}
                  className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {parsing ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Sparkles size={15} aria-hidden />}
                  {parsing ? tr("읽는 중…") : tr("읽어서 채우기")}
                </button>
                <button type="button" onClick={() => setPaste(null)} className="btn btn-ghost px-3 py-2 text-sm">
                  {tr("닫기")}
                </button>
              </div>
              {parseError && <p className="text-xs text-[var(--color-accent)]">{parseError}</p>}
              <p className="text-[11px] leading-relaxed text-foreground/68">
                {tr("붙여 넣은 글은 NVIDIA AI로 보내 읽기만 하고 저장하지 않아요. 아래 칸에 채워진 내용을 확인한 뒤 추가하세요.")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 등록 폼 */}
      {!readOnly && adding && (
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:grid-cols-4">
        <select
          aria-label={tr("종류")}
          value={form.type}
          onChange={setField("type")}
          className="rounded-lg border border-[var(--border-subtle)] bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        >
          {(Object.keys(DOC_META) as TravelDoc["type"][]).map((t) => (
            <option key={t} value={t}>
              {tr(DOC_META[t].label)}
            </option>
          ))}
        </select>
        <input
          aria-label={tr("제목")}
          value={form.title}
          onChange={setField("title")}
          placeholder={tr("제목 * (예: 인천→도쿄 편도)")}
          className="col-span-1 rounded-lg border border-[var(--border-subtle)] bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] sm:col-span-3"
        />
        <input
          aria-label={tr("제공사")}
          value={form.provider}
          onChange={setField("provider")}
          placeholder={tr("제공사 (대한항공)")}
          className="rounded-lg border border-[var(--border-subtle)] bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
        <input
          aria-label={tr("예약번호")}
          value={form.confirmation_code}
          onChange={setField("confirmation_code")}
          placeholder={tr("예약번호")}
          className="rounded-lg border border-[var(--border-subtle)] bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-foreground/65">
          {tr("시작일")}
          <input
            type="date"
            value={form.starts_at}
            onChange={setField("starts_at")}
            className="rounded-lg border border-[var(--border-subtle)] bg-surface px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-foreground/65">
          {tr("종료일")}
          <input
            type="date"
            value={form.ends_at}
            min={form.starts_at || undefined}
            onChange={setField("ends_at")}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-surface px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <input
          aria-label={tr("링크 주소")}
          value={form.url}
          onChange={setField("url")}
          type="url"
          placeholder={tr("링크 URL (https://…)")}
          className="col-span-2 w-full rounded-lg border border-[var(--border-subtle)] bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] sm:col-span-3"
        />
        <button
          onClick={() => void handleSubmit()}
          disabled={!form.title.trim() || saving}
          className="btn btn-primary col-span-2 px-4 text-sm sm:col-span-1"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          {tr("등록")}
        </button>
        <button
          type="button"
          onClick={() => setAdding(false)}
          className="col-span-2 py-1 text-xs font-semibold text-foreground/65 hover:text-foreground sm:col-span-4"
        >
          {tr("취소")}
        </button>
      </div>
      )}

      {/* 문서 카드 리스트 */}
      {loading ? (
        <p className="mt-6 text-center text-sm text-slate-500">{tr("불러오는 중…")}</p>
      ) : docs.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          {tr("등록된 문서가 없어요. 항공권·숙소 바우처를 저장해보세요!")}
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <AnimatePresence initial={false}>
            {docs.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                onRemove={readOnly ? undefined : () => void removeDoc(doc.id)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function DocCard({
  doc,
  onRemove,
}: {
  doc: TravelDoc;
  onRemove?: () => void;
}) {
  const { t, df } = usePrefs();
  const meta = DOC_META[doc.type];
  const url = safeUrl(doc.url);
  const Icon = meta.icon;

  let dDay: number | null = null;
  let ongoing = false;
  if (doc.starts_at) {
    const start = parseISO(doc.starts_at);
    dDay = differenceInCalendarDays(start, new Date());
    if (dDay <= 0) {
      ongoing =
        !doc.ends_at ||
        isWithinInterval(new Date(), {
          start,
          end: parseISO(doc.ends_at),
        });
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22 }}
      className="group relative overflow-hidden rounded-xl bg-surface p-4 ring-1 ring-[var(--border-subtle)] transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${meta.bg}`} />
      <div className="flex items-start gap-3 pl-1">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.text}`}
        >
          <Icon size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold ${meta.text}`}>
              {t(meta.label)}
            </span>
            {ongoing && (
              <span className="animate-pulse rounded-full bg-teal-soft px-2 py-0.5 text-[10px] font-bold text-mint">
                {t("진행 중")}
              </span>
            )}
          </div>
          <p className="truncate font-semibold">{doc.title}</p>
          {(doc.provider || doc.confirmation_code) && (
            <p className="truncate text-xs text-slate-500">
              {[doc.provider, doc.confirmation_code]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-slate-600">
            <CalendarDays size={12} className="shrink-0" />
            <span className="whitespace-nowrap">
              {doc.starts_at
                ? format(parseISO(doc.starts_at), t("M월 d일 (E)"), { locale: df })
                : t("날짜 미정")}
            </span>
            {/* 같은 날 끝나는 예약(항공권 등)은 날짜를 한 번만. 칸이 좁으면 끝 날짜는 다음 줄로 */}
            {doc.ends_at && doc.ends_at.slice(0, 10) !== doc.starts_at?.slice(0, 10) && (
              <span className="whitespace-nowrap">– {format(parseISO(doc.ends_at), t("M월 d일 (E)"), { locale: df })}</span>
            )}
          </p>
          {dDay !== null && !ongoing && (
            <span
              className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                dDay > 0 && dDay <= 7
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]"
              }`}
            >
              {dDay > 0 ? `D-${dDay}` : dDay === 0 ? "D-DAY" : t("종료됨")}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("{title} 링크 열기", { title: doc.title })}
              className="text-slate-400 transition hover:text-[var(--color-primary)]"
            >
              <ExternalLink size={16} />
            </a>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              aria-label={t("{title} 삭제", { title: doc.title })}
              className="text-slate-400 transition hover:text-[var(--color-accent)]"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.li>
  );
}
