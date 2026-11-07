"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, SlidersHorizontal, Sun } from "lucide-react";
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
export default function PrefsToggle({
  tone = "ink",
  className = "",
  compact = false,
}: {
  tone?: "ink" | "light";
  className?: string;
  /** true 면 버튼 하나로 접고, 누르면 세 버튼이 펼쳐진다 (휴대폰 사진 헤더처럼 자리가 좁을 때) */
  compact?: boolean;
}) {
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const base =
    tone === "light"
      ? "bg-black/25 text-white backdrop-blur-md hover:bg-black/40"
      : "text-foreground/65 hover:bg-surface-muted hover:text-foreground";

  if (!compact) return <Controls base={base} className={`inline-flex items-center gap-1 ${className}`} />;
  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t("언어·통화·테마")}
        title={t("언어·통화·테마")}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition ${base}`}
      >
        <SlidersHorizontal size={17} aria-hidden />
      </button>
      {open && (
        <Controls
          base={tone === "light" ? "text-white hover:bg-white/15" : base}
          className={`absolute right-0 top-12 z-50 inline-flex items-center gap-1 rounded-full p-1 shadow-lift ${
            tone === "light" ? "bg-slate-950/80 backdrop-blur-md" : "border border-border-subtle bg-surface"
          }`}
        />
      )}
    </span>
  );
}

function Controls({ base, className }: { base: string; className: string }) {
  const { locale, setLocale, theme, setTheme, currency, setCurrency, t } = usePrefs();
  const meta = THEME_META[theme];
  const Icon = meta.icon;
  return (
    <span className={className}>
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
