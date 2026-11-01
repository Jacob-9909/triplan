import { ko as koDf, enUS } from "date-fns/locale";
import EN from "./en";

export type Locale = "ko" | "en";
export const LOCALES: Locale[] = ["ko", "en"];
export const LOCALE_COOKIE = "lang";

export type Theme = "system" | "light" | "dark";
export const THEME_COOKIE = "theme";

/** 기본 통화: 금액은 원화로 저장하고, 화면에서만 이 통화로 바꿔 보여 준다 */
export const CURRENCY_COOKIE = "currency";
export const HOME_CURRENCIES = ["KRW", "USD", "EUR", "JPY", "GBP", "CNY", "AUD", "CAD", "TWD", "HKD", "SGD", "THB"] as const;
export type HomeCurrency = (typeof HOME_CURRENCIES)[number];

export function isHomeCurrency(v: unknown): v is HomeCurrency {
  return HOME_CURRENCIES.includes(v as HomeCurrency);
}

/** 고르지 않았으면 언어를 따른다: 한국어는 원화, 영어는 달러 */
export function defaultCurrency(locale: Locale): HomeCurrency {
  return locale === "en" ? "USD" : "KRW";
}

export type Vars = Record<string, string | number>;

/**
 * 한국어 문장 자체가 키다: t("가계부") → 영어면 "Budget", 사전에 없으면 한국어 그대로.
 * "{name}" 자리는 vars 로 채운다.
 */
export function translate(locale: Locale, key: string, vars?: Vars): string {
  const text = locale === "en" ? (EN[key] ?? key) : key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;
}

export type T = (key: string, vars?: Vars) => string;

export function makeT(locale: Locale): T {
  return (key, vars) => translate(locale, key, vars);
}

/** date-fns 로케일 */
export function dateLocale(locale: Locale) {
  return locale === "en" ? enUS : koDf;
}

/** Intl·toLocaleString 용 */
export function intlLocale(locale: Locale) {
  return locale === "en" ? "en-US" : "ko-KR";
}

/** 쿠키가 없으면 브라우저 언어: 한국어가 아니면 영어 */
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (cookie === "ko" || cookie === "en") return cookie;
  return !acceptLanguage || /^ko\b/i.test(acceptLanguage) ? "ko" : "en";
}
