"use client";

import { useCallback, useEffect, useState } from "react";
import type { Expense } from "@/lib/types";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useTripChanges } from "@/lib/realtime";

/** Expense에서 서버 생성 필드를 제외한 입력 타입 */
export interface ExpenseInput {
  point_id?: string | null;
  day_number?: number | null;
  category: Expense["category"];
  title: string;
  amount_local: number;
  currency_code: string;
  spent_at: string | null;
}

export interface ExchangeRateResult {
  from: string;
  to: string;
  rate: number;
  source: string;
  stale: boolean;
}

/** 지정한 날짜(과거면 그날 환율)의 원화 환율 조회 */
export async function fetchKrwRate(
  from: string,
  date?: string | null,
): Promise<ExchangeRateResult> {
  const params = new URLSearchParams({ from, to: "KRW" });
  if (date) params.set("date", date);
  return apiGet<ExchangeRateResult>(`/api/exchange-rate?${params.toString()}`).catch(() => {
    throw new Error("환율 조회에 실패했습니다.");
  });
}

export function useExpenses(tripId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (onDone: (data: Expense[], err: string | null) => void) => {
      try {
        const data = await apiGet<Expense[]>(`/api/expenses?trip_id=${tripId}`);
        onDone(data ?? [], null);
      } catch (err) {
        onDone([], (err as Error).message);
      }
    },
    [tripId],
  );

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    void fetchAll((data, err) => {
      if (cancelled) return;
      if (err) setError(err);
      else setExpenses(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tripId, fetchAll]);

  useTripChanges(tripId, ["expenses"], () => {
    void fetchAll((data, err) => {
      if (!err) setExpenses(data);
    });
  });

  /** 새로고침 (명시적 호출용) */
  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchAll((data, err) => {
      if (err) setError(err);
      else setExpenses(data);
      setLoading(false);
    });
  }, [fetchAll]);

  /** 저장 시 환율을 조회해 exchange_rate_krw / amount_krw를 계산해 함께 저장 */
  const addExpense = useCallback(
    async (input: ExpenseInput): Promise<Expense | null> => {
      try {
        const rateInfo = await fetchKrwRate(input.currency_code, input.spent_at);
        const created = await apiPost<Expense>("/api/expenses", {
          trip_id: tripId,
          point_id: input.point_id ?? null,
          day_number: input.day_number ?? null,
          category: input.category,
          title: input.title,
          amount_local: input.amount_local,
          currency_code: input.currency_code,
          exchange_rate_krw: rateInfo.rate,
          amount_krw: Math.round(input.amount_local * rateInfo.rate),
          spent_at: input.spent_at,
        });
        setExpenses((prev) => [...prev, created]);
        return created;
      } catch (err) {
        setError((err as Error).message);
        return null;
      }
    },
    [tripId],
  );

  /** patch의 금액/통화가 바뀌면 환율 재계산 */
  const updateExpense = useCallback(
    async (
      id: string,
      patch: Partial<Omit<Expense, "id" | "trip_id">>,
    ): Promise<boolean> => {
      const finalPatch = { ...patch };
      const needRate =
        patch.amount_local != null || patch.currency_code != null || patch.spent_at != null;

      if (needRate) {
        const current = expenses.find((e) => e.id === id);
        const currency =
          finalPatch.currency_code ?? current?.currency_code ?? "KRW";
        const amount = finalPatch.amount_local ?? current?.amount_local ?? 0;
        const spentAt = finalPatch.spent_at ?? current?.spent_at ?? null;
        try {
          const rateInfo = await fetchKrwRate(currency, spentAt);
          finalPatch.exchange_rate_krw = rateInfo.rate;
          finalPatch.amount_krw = Math.round(amount * rateInfo.rate);
        } catch (err) {
          setError((err as Error).message);
          return false;
        }
      }

      try {
        await apiPatch(`/api/expenses/${id}`, finalPatch);
      } catch (err) {
        setError((err as Error).message);
        return false;
      }
      setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...finalPatch } : e)));
      return true;
    },
    [expenses],
  );

  const deleteExpense = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiDelete(`/api/expenses/${id}`);
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    return true;
  }, []);

  return {
    expenses,
    loading,
    error,
    refresh,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}
