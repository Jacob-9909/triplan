"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { Expense } from "@/lib/types";
import { CATEGORIES } from "./categories";
import { fetchKrwRate, type ExpenseInput } from "./useExpenses";

interface ExpenseFormProps {
  baseCurrency: string;
  /** 수정 모드일 때 기존 항목 */
  editing?: Expense | null;
  onSubmit: (input: ExpenseInput) => Promise<boolean>;
  onCancelEdit?: () => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({
  baseCurrency,
  editing = null,
  onSubmit,
  onCancelEdit,
}: ExpenseFormProps) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [category, setCategory] = useState<Expense["category"]>(
    editing?.category ?? "food",
  );
  const [amount, setAmount] = useState(
    editing ? String(editing.amount_local) : "",
  );
  const [currency, setCurrency] = useState(
    editing?.currency_code ?? baseCurrency,
  );
  const [spentAt, setSpentAt] = useState(
    editing?.spent_at ?? todayStr(),
  );
  const [saving, setSaving] = useState(false);
  const [rateNote, setRateNote] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountLocal = Number(amount);
    if (!title.trim() || !Number.isFinite(amountLocal) || amountLocal <= 0) return;
    setSaving(true);
    setRateNote(null);

    // 저장 전 환율 미리 조회해 스냅샷 안내
    let ok = false;
    try {
      if (editing) {
        ok = await onSubmit({
          category,
          title: title.trim(),
          amount_local: amountLocal,
          currency_code: currency,
          spent_at: spentAt || null,
        });
      } else {
        const rateInfo = await fetchKrwRate(currency, spentAt);
        setRateNote(
          rateInfo.stale
            ? `최신 환율 조회 실패 — 대략치(1 ${currency} ≈ ₩${rateInfo.rate.toLocaleString()})로 저장합니다.`
            : `1 ${currency} ≈ ₩${rateInfo.rate.toLocaleString()} 적용`,
        );
        ok = await onSubmit({
          category,
          title: title.trim(),
          amount_local: amountLocal,
          currency_code: currency,
          spent_at: spentAt || null,
        });
      }
    } finally {
      setSaving(false);
      if (ok && !editing) {
        setTitle("");
        setAmount("");
        setRateNote(null);
      }
      if (ok && editing) onCancelEdit?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-4 md:p-5 lg:p-6">
      <div className="grid grid-cols-2 gap-3">
        {/* 항목명 */}
        <label className="col-span-2 flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/68">항목명</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 라멘, 기념품"
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            required
          />
        </label>

        {/* 카테고리 */}
        <div className="col-span-2">
          <span className="mb-1.5 block text-xs font-semibold text-foreground/68">
            카테고리
          </span>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {CATEGORIES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-medium transition ${
                  category === value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--foreground)]/70 hover:border-[var(--color-primary)]/40"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 금액 + 통화 */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/68">금액</span>
          <div className="flex gap-1.5">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-sm tabular-nums outline-none focus:border-[var(--color-primary)]"
              required
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            >
              <option value={baseCurrency}>{baseCurrency}</option>
              {["KRW", "USD", "JPY", "EUR", "TWD", "THB", "CNY"]
                .filter((c) => c !== baseCurrency)
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>
        </label>

        {/* 날짜 */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/68">날짜</span>
          <input
            type="date"
            value={spentAt}
            onChange={(e) => setSpentAt(e.target.value)}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </label>
      </div>

      {rateNote && (
        <p className="text-xs text-[var(--color-mint)]">{rateNote}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        {editing && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-xl px-3 py-2 text-sm font-medium text-foreground/68 hover:text-[var(--foreground)]"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary px-4 text-sm"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {editing ? "수정하기" : "추가하기"}
        </button>
      </div>
    </form>
  );
}
