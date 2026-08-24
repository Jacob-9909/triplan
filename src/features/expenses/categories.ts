import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  MoreHorizontal,
  Plane,
  ShoppingBag,
  Ticket,
  Train,
  Utensils,
} from "lucide-react";
import type { Expense } from "@/lib/types";

export const CATEGORIES: {
  value: Expense["category"];
  label: string;
  icon: LucideIcon;
  /** 막대그래프/칩 배경색 */
  barClass: string;
}[] = [
  { value: "food", label: "식사", icon: Utensils, barClass: "bg-[var(--color-accent)]" },
  { value: "shopping", label: "쇼핑", icon: ShoppingBag, barClass: "bg-[var(--color-sand)]" },
  { value: "transport", label: "교통", icon: Train, barClass: "bg-[var(--color-primary)]" },
  { value: "stay", label: "숙박", icon: BedDouble, barClass: "bg-[var(--color-violet)]" },
  { value: "activity", label: "액티비티", icon: Ticket, barClass: "bg-[var(--color-mint)]" },
  { value: "flight", label: "항공", icon: Plane, barClass: "bg-[var(--color-primary-strong)]" },
  { value: "etc", label: "기타", icon: MoreHorizontal, barClass: "bg-gray-400" },
];

export function categoryMeta(value: Expense["category"]) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

const SYMBOLS: Record<string, string> = {
  KRW: "₩",
  USD: "$",
  EUR: "€",
  JPY: "¥",
  CNY: "¥",
  TWD: "NT$",
  HKD: "HK$",
  SGD: "S$",
  THB: "฿",
  VND: "₫",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
};

/** 통화별 소수점 자릿수 (엔화/베트남동 등은 정수) */
function decimalsFor(code: string): number {
  return ["JPY", "KRW", "VND"].includes(code.toUpperCase()) ? 0 : 2;
}

export function currencySymbol(code: string): string {
  return SYMBOLS[code.toUpperCase()] ?? code;
}

export function formatMoney(amount: number, code: string): string {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalsFor(code),
  }).format(amount);
}
