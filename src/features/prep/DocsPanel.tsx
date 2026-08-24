"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  differenceInCalendarDays,
  format,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { ko } from "date-fns/locale";
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
  Stamp,
  Ticket,
  Trash2,
} from "lucide-react";
import type { TravelDoc } from "@/lib/types";
import { useTravelDocs } from "./useTravelDocs";

const DOC_META: Record<
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
    bg: "bg-[var(--color-mint)]/15",
    text: "text-emerald-600",
  },
  etc: {
    label: "기타",
    icon: FileText,
    bg: "bg-slate-100",
    text: "text-slate-500",
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

export default function DocsPanel({ tripId }: { tripId: string }) {
  const { docs, loading, addDoc, removeDoc } = useTravelDocs(tripId);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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
  };

  return (
    <section className="card fade-up p-6 lg:p-7">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Ticket size={18} />
        </span>
        여행 문서 보관함
      </h2>

      {/* 등록 폼 */}
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:grid-cols-4">
        <select
          value={form.type}
          onChange={setField("type")}
          className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        >
          {(Object.keys(DOC_META) as TravelDoc["type"][]).map((t) => (
            <option key={t} value={t}>
              {DOC_META[t].label}
            </option>
          ))}
        </select>
        <input
          value={form.title}
          onChange={setField("title")}
          placeholder="제목 * (예: 인천→도쿄 편도)"
          className="col-span-1 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] sm:col-span-3"
        />
        <input
          value={form.provider}
          onChange={setField("provider")}
          placeholder="제공사 (대한항공)"
          className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
        <input
          value={form.confirmation_code}
          onChange={setField("confirmation_code")}
          placeholder="예약번호"
          className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
        <input
          type="date"
          value={form.starts_at}
          onChange={setField("starts_at")}
          className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
        <div className="relative">
          <input
            type="date"
            value={form.ends_at}
            min={form.starts_at || undefined}
            onChange={setField("ends_at")}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 pr-8 text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <input
          value={form.url}
          onChange={setField("url")}
          type="url"
          placeholder="링크 URL (https://…)"
          className="col-span-2 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] sm:col-span-3"
        />
        <button
          onClick={() => void handleSubmit()}
          disabled={!form.title.trim() || saving}
          className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          등록
        </button>
      </div>

      {/* 문서 카드 리스트 */}
      {loading ? (
        <p className="mt-6 text-center text-sm text-slate-400">불러오는 중…</p>
      ) : docs.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-400">
          등록된 문서가 없어요. 항공권·숙소 바우처를 저장해보세요!
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {docs.map((doc) => (
              <DocCard key={doc.id} doc={doc} onRemove={() => void removeDoc(doc.id)} />
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
  onRemove: () => void;
}) {
  const meta = DOC_META[doc.type];
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
      className="group relative overflow-hidden rounded-xl bg-white p-4 ring-1 ring-[var(--border-subtle)] transition hover:-translate-y-0.5 hover:shadow-md"
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
              {meta.label}
            </span>
            {ongoing && (
              <span className="animate-pulse rounded-full bg-[var(--color-mint)]/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                진행 중
              </span>
            )}
          </div>
          <p className="truncate font-semibold">{doc.title}</p>
          {(doc.provider || doc.confirmation_code) && (
            <p className="truncate text-xs text-slate-400">
              {[doc.provider, doc.confirmation_code]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <CalendarDays size={12} />
            {doc.starts_at
              ? format(parseISO(doc.starts_at), "M월 d일 (E)", { locale: ko })
              : "날짜 미정"}
            {doc.ends_at &&
              ` ~ ${format(parseISO(doc.ends_at), "M월 d일", { locale: ko })}`}
          </p>
          {dDay !== null && !ongoing && (
            <span
              className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                dDay > 0 && dDay <= 7
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]"
              }`}
            >
              {dDay > 0 ? `D-${dDay}` : dDay === 0 ? "D-DAY" : "종료됨"}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          {doc.url && (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${doc.title} 링크 열기`}
              className="text-slate-300 transition hover:text-[var(--color-primary)]"
            >
              <ExternalLink size={16} />
            </a>
          )}
          <button
            onClick={onRemove}
            aria-label={`${doc.title} 삭제`}
            className="text-slate-300 transition hover:text-[var(--color-accent)]"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.li>
  );
}
