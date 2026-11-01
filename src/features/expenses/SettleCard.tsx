"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Plus, Users, X } from "lucide-react";
import type { Expense } from "@/lib/types";
import { usePrefs } from "@/i18n/I18nProvider";
import { settle } from "./settle";

/** 동행자 관리 + 누가 누구에게 얼마 보내면 되는지 */
export default function SettleCard({
  travelers,
  expenses,
  onTravelersChange,
}: {
  travelers: string[];
  expenses: Expense[];
  /** 없으면 보기 전용 */
  onTravelersChange?: (names: string[]) => void;
}) {
  const { t: tr, money } = usePrefs();
  const [name, setName] = useState("");
  const result = useMemo(() => settle(expenses, travelers), [expenses, travelers]);
  const trimmed = name.trim();

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || travelers.includes(trimmed) || travelers.length >= 20) return;
    onTravelersChange?.([...travelers, trimmed]);
    setName("");
  }

  if (!onTravelersChange && travelers.length < 2) return null;

  return (
    <div className="card space-y-4 p-5">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground/68">
        <Users size={14} /> {tr("동행자 정산")}
      </h3>

      <div className="flex flex-wrap gap-1.5">
        {travelers.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-surface-muted py-1.5 pl-3 pr-1.5 text-xs font-semibold">
            {t}
            {onTravelersChange && (
              <button
                type="button"
                onClick={() => onTravelersChange(travelers.filter((x) => x !== t))}
                aria-label={tr("{name} 빼기", { name: t })}
                className="flex h-5 w-5 items-center justify-center rounded-full text-foreground/60 hover:bg-accent-soft hover:text-accent"
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {onTravelersChange && (
          <form onSubmit={add} className="flex items-center gap-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder={tr("이름 추가")}
              aria-label={tr("동행자 이름")}
              className="w-24 rounded-full border border-border-subtle bg-surface-muted px-3 py-1.5 text-xs outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!trimmed || travelers.includes(trimmed)}
              aria-label={tr("동행자 추가")}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-primary-strong disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
          </form>
        )}
      </div>

      {travelers.length < 2 ? (
        <p className="text-xs text-foreground/68">{tr("함께 가는 사람을 두 명 이상 넣으면 지출마다 낸 사람을 고르고, 여기서 정산해 드려요.")}</p>
      ) : result.transfers.length === 0 ? (
        // 낸 사람이 정해진 지출이 하나도 없으면 아래 안내만
        result.skipped < expenses.length && <p className="text-sm font-semibold text-mint">{tr("보낼 돈이 없어요. 정산 끝!")}</p>
      ) : (
        <ul className="space-y-2">
          {result.transfers.map((t) => (
            <li key={`${t.from}-${t.to}`} className="flex items-center gap-2 rounded-xl bg-surface-muted px-3.5 py-2.5 text-sm">
              <span className="font-semibold">{t.from}</span>
              <ArrowRight size={14} className="text-foreground/50" />
              <span className="font-semibold">{t.to}</span>
              <span className="ml-auto font-bold tabular-nums text-primary-strong">{money(t.krw)}</span>
            </li>
          ))}
        </ul>
      )}
      {travelers.length >= 2 && result.skipped > 0 && (
        <p className="text-xs text-foreground/68">
          {tr("낸 사람이 없는 지출 {n}건은 빼고 계산했어요.", { n: result.skipped })}{onTravelersChange && <>{" "}{tr("연필 버튼으로 낸 사람을 정해 주세요.")}</>}
        </p>
      )}
    </div>
  );
}
