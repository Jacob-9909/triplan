"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { PiggyBank, Wallet } from "lucide-react";
import MoneyInput from "@/features/ui/MoneyInput";
import { usePrefs } from "@/i18n/I18nProvider";
import type { Expense } from "@/lib/types";
import { CATEGORIES, currencySymbol, formatMoney } from "./categories";

interface ExpenseSummaryProps {
  expenses: Expense[];
  /** 여행 기간 — Day 추이 계산에 사용 */
  startDate?: string | null;
  endDate?: string | null;
  budgetKrw?: number | null;
  /** 없으면 예산을 바꿀 수 없다 */
  onBudgetChange?: (krw: number | null) => void;
}

export default function ExpenseSummary({
  expenses,
  startDate,
  endDate,
  budgetKrw = null,
  onBudgetChange,
}: ExpenseSummaryProps) {
  const { t, money } = usePrefs();
  const { totalKrw, localTotals, byCategory, byDay, avgDaily, daysCount } =
    useMemo(() => {
      const localMap = new Map<string, number>();
      const catMap = new Map<Expense["category"], number>();
      const dayMap = new Map<number, number>();

      let sumKrw = 0;
      for (const e of expenses) {
        sumKrw += e.amount_krw;
        localMap.set(
          e.currency_code,
          (localMap.get(e.currency_code) ?? 0) + e.amount_local,
        );
        catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount_krw);
        if (e.day_number != null) {
          dayMap.set(e.day_number, (dayMap.get(e.day_number) ?? 0) + e.amount_krw);
        }
      }

      // day_number가 없는 항목은 날짜 기준으로 Day 계산
      for (const e of expenses) {
        if (e.day_number == null && e.spent_at && startDate) {
          const diff = Math.floor(
            (parseDate(e.spent_at).getTime() - parseDate(startDate).getTime()) /
              86_400_000,
          );
          const day = diff >= 0 ? diff + 1 : 0;
          if (!dayMap.has(day)) dayMap.set(day, 0);
          dayMap.set(day, (dayMap.get(day) ?? 0) + e.amount_krw);
        }
      }

      const maxDay = dayMap.size > 0 ? Math.max(...dayMap.keys()) : 0;
      const days = endDate && startDate
        ? Math.max(1, Math.ceil((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / 86_400_000))
        : maxDay || 1;
      const trendDays = Array.from({ length: Math.max(maxDay, days) }, (_, i) => ({
        day: i + 1,
        krw: dayMap.get(i + 1) ?? 0,
      }));

      return {
        totalKrw: sumKrw,
        localTotals: [...localMap.entries()].sort((a, b) => b[1] - a[1]),
        byCategory: CATEGORIES.map((c) => ({
          ...c,
          krw: catMap.get(c.value) ?? 0,
        })).filter((c) => c.krw > 0),
        byDay: trendDays,
        avgDaily: trendDays.length > 0 ? Math.round(sumKrw / trendDays.length) : 0,
        daysCount: trendDays.length,
      };
    }, [expenses, startDate, endDate]);

  const maxCat = Math.max(1, ...byCategory.map((c) => c.krw));
  const maxDayKrw = Math.max(1, ...byDay.map((d) => d.krw));

  return (
    <div className="space-y-4">
      {/* 총액 */}
      <div className="card p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground/68">
          <Wallet size={14} />
          {t("총 지출 ({n}일)", { n: daysCount })}
        </div>
        <p className="mt-1 text-2xl font-extrabold tabular-nums text-[var(--color-primary-strong)] md:text-3xl">
          {money(totalKrw)}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-foreground/68">
          {t("일평균 {amount}", { amount: money(avgDaily) })}
          {localTotals.length > 0 && (
            <>
              {" · "}
              {localTotals
                .filter(([code]) => code !== "KRW")
                .map(([code, amt]) => `${currencySymbol(code)} ${formatMoney(amt, code)}`)
                .join(" + ")}
            </>
          )}
        </p>
        <Budget
          spentKrw={totalKrw}
          budgetKrw={budgetKrw}
          startDate={startDate}
          endDate={endDate}
          onChange={onBudgetChange}
        />
      </div>

      {/* 카테고리별 지출 막대 */}
      {byCategory.length > 0 && (
        <div className="card space-y-2.5 p-5">
          <h3 className="text-xs font-semibold text-foreground/68">{t("카테고리별")}</h3>
          {byCategory.map(({ value, label, krw, barClass }) => (
            <div key={value} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs font-medium">{t(label)}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                  style={{ width: `${Math.round((krw / maxCat) * 100)}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-xs tabular-nums text-[var(--foreground)]/70">
                {money(krw)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Day별 추이 */}
      {byDay.length > 1 && (
        <div className="card p-5">
          <h3 className="text-xs font-semibold text-foreground/68">{t("Day별 지출 추이")}</h3>
          <div className="mt-4 flex h-28 items-end gap-1.5 overflow-x-auto pb-1">
            {byDay.map(({ day, krw }) => (
              <div key={day} className="group flex min-w-6 flex-1 flex-col items-center gap-1">
                <span className="hidden text-[10px] tabular-nums text-foreground/68 group-hover:block">
                  {krw > 9999 ? `${Math.round(krw / 1000)}k` : krw}
                </span>
                <div
                  className="w-full rounded-t-md bg-[var(--color-primary)] transition-all duration-500"
                  style={{
                    height: `${Math.max(4, Math.round((krw / maxDayKrw) * 88))}px`,
                    opacity: krw === 0 ? 0.15 : 1,
                  }}
                  title={`Day ${day}: ${money(krw)}`}
                />
                <span className="text-[10px] tabular-nums text-foreground/68">
                  {day}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 예산 대비 지출. 여행이 안 끝났으면 남은 날 하루에 쓸 수 있는 돈도 */
function Budget({
  spentKrw,
  budgetKrw,
  startDate,
  endDate,
  onChange,
}: {
  spentKrw: number;
  budgetKrw: number | null;
  startDate?: string | null;
  endDate?: string | null;
  onChange?: (krw: number | null) => void;
}) {
  const { t, money } = usePrefs();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number | null>(budgetKrw);

  if (editing && onChange) {
    return (
      <div className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-4">
        <p className="text-xs font-semibold text-foreground/68">{t("여행 예산")}</p>
        <MoneyInput value={draft} onChange={setDraft} placeholder={t("예산")} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 text-sm font-medium text-foreground/68">
            {t("취소")}
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(draft);
              setEditing(false);
            }}
            className="btn btn-primary px-4 text-sm"
          >
            {t("저장")}
          </button>
        </div>
      </div>
    );
  }

  if (!budgetKrw) {
    return onChange ? (
      <button
        type="button"
        onClick={() => {
          setDraft(null);
          setEditing(true);
        }}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary-strong)]"
      >
        <PiggyBank size={14} /> {t("예산 정하기")}
      </button>
    ) : null;
  }

  const left = budgetKrw - spentKrw;
  const ratio = Math.min(1, spentKrw / budgetKrw);
  // 오늘을 포함한 남은 날 (여행 전이면 전체 일수, 끝났으면 0)
  const today = new Date();
  const days =
    startDate && endDate
      ? Math.max(0, differenceInCalendarDays(parseISO(endDate), today) + 1) -
        Math.max(0, differenceInCalendarDays(parseISO(startDate), today))
      : 0;

  return (
    <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
      <div className="flex items-center justify-between text-xs font-semibold text-foreground/68">
        <span className="inline-flex items-center gap-1.5">
          <PiggyBank size={14} /> {t("예산 {amount}", { amount: money(budgetKrw) })}
        </span>
        {onChange && (
          <button
            type="button"
            onClick={() => {
              setDraft(budgetKrw);
              setEditing(true);
            }}
            className="text-[var(--color-primary-strong)]"
          >
            {t("바꾸기")}
          </button>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={t("예산 사용")}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--surface-muted)]"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${left < 0 ? "bg-[var(--color-accent)]" : "bg-[var(--color-mint)]"}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs tabular-nums text-foreground/72">
        {left >= 0 ? (
          <>
            {t("{amount} 남음", { amount: money(left) })}
            {days > 0 && ` · ${t("남은 {days}일 동안 하루 {amount}", { days, amount: money(Math.floor(left / days)) })}`}
          </>
        ) : (
          <span className="font-semibold text-[var(--color-accent)]">{t("{amount} 초과", { amount: money(-left) })}</span>
        )}
      </p>
    </div>
  );
}

function parseDate(s: string): Date {
  return new Date(`${s.slice(0, 10)}T00:00:00`);
}
