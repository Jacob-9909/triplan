"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import {
  CURRENCY_COOKIE,
  dateLocale,
  defaultCurrency,
  intlLocale,
  LOCALE_COOKIE,
  makeT,
  THEME_COOKIE,
  type HomeCurrency,
  type Locale,
  type T,
  type Theme,
} from "./translate";

interface Prefs {
  locale: Locale;
  t: T;
  /** date-fns format 의 locale 옵션 */
  df: ReturnType<typeof dateLocale>;
  /** toLocaleString 에 넘길 로케일 */
  intl: string;
  setLocale: (l: Locale) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** 기본 통화 (금액을 이 통화로 보여 준다) */
  currency: HomeCurrency;
  setCurrency: (c: HomeCurrency) => void;
  /** 1원이 기본 통화로 얼마인지. 아직 모르면 null (그동안은 원화로 보여 준다) */
  krwRate: number | null;
  /** 원화 금액 → 기본 통화 문자열: "₩12,000" · "$8.70" */
  money: (krw: number) => string;
}

const Ctx = createContext<Prefs | null>(null);

function saveCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

/** 언어·테마. 처음 값은 서버가 쿠키로 정해 넘긴다 (깜빡임 없음) */
export function PrefsProvider({
  locale: initialLocale,
  theme: initialTheme,
  currency: initialCurrency,
  children,
}: {
  locale: Locale;
  theme: Theme;
  currency: HomeCurrency | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);
  const [theme, setThemeState] = useState(initialTheme);
  const [picked, setPicked] = useState(initialCurrency);
  const currency = picked ?? defaultCurrency(locale);
  const [rates, setRates] = useState<Partial<Record<HomeCurrency, number>>>({ KRW: 1 });
  const krwRate = rates[currency] ?? null;

  // 원화 → 기본 통화 환율 (최신값). 실패하면(체험 계정 등) 원화로 보여 준다
  useEffect(() => {
    if (rates[currency] != null) return;
    let alive = true;
    apiGet<{ rate: number }>(`/api/exchange-rate?from=KRW&to=${currency}`)
      .then((r) => alive && r.rate > 0 && setRates((prev) => ({ ...prev, [currency]: r.rate })))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [currency, rates]);

  const value = useMemo<Prefs>(
    () => ({
      locale,
      t: makeT(locale),
      df: dateLocale(locale),
      intl: intlLocale(locale),
      setLocale(l) {
        saveCookie(LOCALE_COOKIE, l);
        document.documentElement.lang = l;
        setLocaleState(l);
        // 서버가 그린 부분(제목 등)도 새 언어로
        router.refresh();
      },
      theme,
      setTheme(t) {
        saveCookie(THEME_COOKIE, t);
        if (t === "system") delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = t;
        setThemeState(t);
      },
      currency,
      setCurrency(c) {
        saveCookie(CURRENCY_COOKIE, c);
        setPicked(c);
      },
      krwRate,
      money(krw) {
        const intl = intlLocale(locale);
        if (krwRate == null) return new Intl.NumberFormat(intl, { style: "currency", currency: "KRW" }).format(Math.round(krw));
        return new Intl.NumberFormat(intl, { style: "currency", currency }).format(krw * krwRate);
      },
    }),
    [locale, theme, router, currency, krwRate]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): Prefs {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePrefs must be used inside PrefsProvider");
  return v;
}

/** 대부분은 이것만 쓴다: const t = useT(); t("가계부") */
export function useT(): T {
  return usePrefs().t;
}
