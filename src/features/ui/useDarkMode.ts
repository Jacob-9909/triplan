"use client";

import { useSyncExternalStore } from "react";
import { usePrefs } from "@/i18n/I18nProvider";

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(fn: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
}

/** 지금 화면이 다크 모드인지: 직접 고른 테마, 시스템이면 OS 설정 (지도처럼 CSS 로 못 바꾸는 것에 쓴다) */
export function useDarkMode() {
  const { theme } = usePrefs();
  const systemDark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
  return theme === "dark" || (theme === "system" && systemDark);
}
