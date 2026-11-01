"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { HOME_CURRENCIES, isHomeCurrency, type Theme } from "./translate";
import { usePrefs } from "./I18nProvider";

const NEXT_THEME: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const THEME_META = {
  system: { icon: Monitor, label: "시스템 테마" },
  light: { icon: Sun, label: "라이트 모드" },
  dark: { icon: Moon, label: "다크 모드" },
} as const;

/**
 * 언어(한/EN), 기본 통화, 테마(시스템 → 라이트 → 다크) 전환.
 * tone="light" 는 사진 위에 올릴 때
 */
export default function PrefsToggle({ tone = "ink", className = "" }: { tone?: "ink" | "light"; className?: string }) {
  const { locale, setLocale, theme, setTheme, currency, setCurrency, t } = usePrefs();
  const meta = THEME_META[theme];
  const Icon = meta.icon;
  const base =
    tone === "light"
      ? "bg-black/25 text-white backdrop-blur-md hover:bg-black/40"
      : "text-foreground/65 hover:bg-surface-muted hover:text-foreground";

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
        aria-label={t("언어 바꾸기")}
        title={t("언어 바꾸기")}
        className={`flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-xs font-bold transition ${base}`}
      >
        {locale === "ko" ? "EN" : "한"} {/* i18n-ignore: 바꿀 언어 이름 */}
      </button>
      <select
        value={currency}
        onChange={(e) => isHomeCurrency(e.target.value) && setCurrency(e.target.value)}
        aria-label={t("기본 통화")}
        title={t("금액을 이 통화로 대략 바꿔 보여 줘요")}
        className={`h-10 cursor-pointer appearance-none rounded-full bg-transparent px-2.5 text-center text-xs font-bold outline-none transition ${base}`}
      >
        {HOME_CURRENCIES.map((c) => (
          <option key={c} value={c} className="bg-surface text-foreground">
            {c}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setTheme(NEXT_THEME[theme])}
        aria-label={`${t(meta.label)} · ${t("테마 바꾸기")}`}
        title={t(meta.label)}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition ${base}`}
      >
        <Icon size={17} aria-hidden />
      </button>
    </span>
  );
}
