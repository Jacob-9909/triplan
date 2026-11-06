"use client";

import { useState } from "react";
import type { Expense, Trip } from "@/lib/types";
import { useT } from "@/i18n/I18nProvider";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import ExpenseSummary from "./ExpenseSummary";
import SettleCard from "./SettleCard";
import { useExpenses } from "./useExpenses";

export default function ExpensesTab({
  tripId,
  day,
  canEdit,
  trip,
  onPatchTrip,
}: {
  tripId: string;
  day: number;
  canEdit: boolean;
  trip: Trip;
  onPatchTrip: (patch: Partial<Trip>) => void;
}) {
  const t = useT();
  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses(tripId);
  const [editing, setEditing] = useState<Expense | null>(null);
  const travelers = trip.travelers ?? [];
  const summary = (
    <ExpenseSummary
      expenses={expenses}
      startDate={trip.start_date}
      endDate={trip.end_date}
      budgetKrw={trip.budget_krw}
      onBudgetChange={canEdit ? (budget_krw) => onPatchTrip({ budget_krw }) : undefined}
    />
  );
  const settleCard = (
    <SettleCard
      travelers={travelers}
      expenses={expenses}
      onTravelersChange={canEdit ? (names) => onPatchTrip({ travelers: names }) : undefined}
    />
  );

  if (!canEdit) {
    return (
      <div className="space-y-4">
        {summary}
        {settleCard}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
      <div className="space-y-4 lg:col-span-2">
        <ExpenseForm
          key={editing?.id ?? "new"}
          baseCurrency={trip.base_currency || "KRW"}
          travelers={travelers}
          editing={editing}
          onCancelEdit={() => setEditing(null)}
          onSubmit={async (input) => {
            if (!editing) return (await addExpense({ ...input, day_number: day })) !== null;
            // 바뀐 칸만 보낸다. 금액·통화·날짜가 그대로면 환율도 그대로 둔다
            const patch = Object.fromEntries(
              Object.entries(input).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(editing[k as keyof Expense] ?? null))
            );
            return Object.keys(patch).length === 0 || updateExpense(editing.id, patch);
          }}
        />
        <p className="px-1 text-xs text-foreground/68">
          {editing
            ? t("'{title}' 수정 중이에요.", { title: editing.title })
            : t("새 지출은 지금 보고 있는 Day {day}에 기록돼요.", { day })}
        </p>
        {settleCard}
      </div>
      <div className="space-y-4 lg:col-span-3">
        {summary}
        <ExpenseList
          expenses={expenses}
          onDelete={async (e) => {
            await deleteExpense(e.id);
          }}
          onEdit={(e) => {
            setEditing(e);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </div>
  );
}
