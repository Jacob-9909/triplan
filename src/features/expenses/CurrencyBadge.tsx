"use client";

import { usePrefs } from "@/i18n/I18nProvider";
import { currencySymbol, formatMoney } from "./categories";

interface CurrencyBadgeProps {
  amountLocal: number;
  currencyCode: string;
  /** 환산된 원화 금액. null이면 괄호 부분 생략 */
  amountKrw?: number | null;
  className?: string;
}

/** "¥ 3,500 (≈ ₩32,110)" 형태의 배지. 괄호 안은 기본 통화(원화·달러 등)로 바꾼 대략값 */
export default function CurrencyBadge({
  amountLocal,
  currencyCode,
  amountKrw,
  className = "",
}: CurrencyBadgeProps) {
  const { currency, money } = usePrefs();
  const same = currencyCode.toUpperCase() === currency;
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-xs font-medium tabular-nums text-[var(--color-primary-strong)] ${className}`}
    >
      <span>
        {currencySymbol(currencyCode)} {formatMoney(amountLocal, currencyCode)}
      </span>
      {!same && amountKrw != null && (
        <span className="text-[11px] font-normal text-foreground/68">(≈ {money(amountKrw)})</span>
      )}
    </span>
  );
}
