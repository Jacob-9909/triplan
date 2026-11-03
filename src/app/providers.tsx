"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, type ReactNode } from "react";
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
  // 오프라인 보기 (public/sw.js). 개발 서버에서는 저장본이 수정을 가리므로 끈다
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    }
  }, []);

  return (
    <PrefsProvider locale={locale} theme={theme} currency={currency}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </PrefsProvider>
  );
}
