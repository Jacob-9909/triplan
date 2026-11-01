"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { format, isValid, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import type { Expense } from "@/lib/types";
import { usePrefs } from "@/i18n/I18nProvider";
import CurrencyBadge from "./CurrencyBadge";
import { categoryMeta } from "./categories";

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

function dateKey(e: Expense): string {
  return e.spent_at ?? "날짜 없음";
}

export default function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  const { t, df, intl, money } = usePrefs();
  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const key = dateKey(e);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()].sort((a, b) =>
      a[0] === "날짜 없음" ? 1 : b[0] === "날짜 없음" ? -1 : b[0].localeCompare(a[0]),
    );
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-foreground/68">
        {t("아직 기록된 지출이 없어요. 첫 지출을 추가해보세요!")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(([key, items]) => {
        const dayTotalKrw = items.reduce((s, e) => s + e.amount_krw, 0);
        const d = key !== "날짜 없음" && isValid(parseISO(key)) ? parseISO(key) : null;
        return (
          <section key={key} className="card overflow-hidden">
            <header className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2.5">
              <h3 className="text-sm font-bold">{d ? format(d, t("M월 d일 (EEE)"), { locale: df }) : t(key)}</h3>
              <span className="text-xs font-semibold tabular-nums text-foreground/68">
                {money(dayTotalKrw)}
              </span>
            </header>

            <ul>
              {items.map((e) => {
                const meta = categoryMeta(e.category);
                const Icon = meta.icon;
                return (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0 hover:bg-[var(--surface-muted)]/60"
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-white ${meta.barClass}`}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <p className="min-w-0 truncate text-sm font-semibold">{e.title}</p>
                        <CurrencyBadge
                          amountLocal={e.amount_local}
                          currencyCode={e.currency_code}
                          amountKrw={e.amount_krw}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-foreground/68">
                        {t(meta.label)}
                        {e.day_number != null && ` · Day ${e.day_number}`}
                        {e.paid_by && ` · ${t("{name} 결제", { name: e.paid_by })}`}
                        {e.exchange_rate_krw > 0 &&
                          ` · 1${e.currency_code} = ₩${e.exchange_rate_krw.toLocaleString(intl, { maximumFractionDigits: 2 })}`}
                      </p>
                    </div>
                    <button
                      onClick={() => onEdit(e)}
                      aria-label={t("{title} 수정", { title: e.title })}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/68 transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-strong)]"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => onDelete(e)}
                      aria-label={t("{title} 삭제", { title: e.title })}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/68 transition hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
