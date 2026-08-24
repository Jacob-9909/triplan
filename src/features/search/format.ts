import { format } from "date-fns";

/** 170000 → "₩170,000" */
export function formatKrw(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(amount);
  const symbols: Record<string, string> = {
    KRW: "₩",
    USD: "$",
    EUR: "€",
    JPY: "¥",
    CNY: "¥",
    TWD: "NT$",
    HKD: "HK$",
    SGD: "S$",
    THB: "฿",
    GBP: "£",
    AUD: "A$",
    CAD: "C$",
  };
  return `${symbols[currency.toUpperCase()] ?? `${currency} `}${formatted}`;
}

/** 155 → "2시간 35분" */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

/** ISO → "09:15" */
export function isoToHm(iso: string): string {
  try {
    return format(new Date(iso), "HH:mm");
  } catch {
    return "--:--";
  }
}

/** YYYY-MM-DD → "9월 1일 (화)" 스타일 */
export function formatDateKo(isoDate: string): string {
  try {
    return format(new Date(isoDate), "M월 d일 (EEE)", { locale: undefined });
  } catch {
    return isoDate;
  }
}
