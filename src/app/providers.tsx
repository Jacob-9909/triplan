"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { PrefsProvider } from "@/i18n/I18nProvider";
import type { HomeCurrency, Locale, Theme } from "@/i18n/translate";

/** OS의 '동작 줄이기' 설정을 framer-motion 전체에 적용 + 언어·테마 */
export default function Providers({
  children,
  locale,
  theme,
  currency,
}: {
  children: ReactNode;
  locale: Locale;
  theme: Theme;
  currency: HomeCurrency | null;
}) {
  return (
    <PrefsProvider locale={locale} theme={theme} currency={currency}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </PrefsProvider>
  );
}
