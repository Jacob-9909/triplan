"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, MapPin, Search, X } from "lucide-react";
import type { City } from "@/data/world";
import CoverPhoto from "@/features/ui/CoverPhoto";
import {
  searchDestinations,
  WORLD,
  type ContinentData,
  type Country,
  type DestinationSelection,
} from "@/data/world";

interface DestinationSelectorProps {
  /** 3단계 선택이 모두 끝나면 호출됨 */
  onComplete: (selection: DestinationSelection) => void;
}

type Step = "continent" | "country" | "city";

const stepLabels: Record<Step, string> = {
  continent: "대륙 선택",
  country: "국가 선택",
  city: "도시/지역 선택",
};

export default function DestinationSelector({ onComplete }: DestinationSelectorProps) {
  const [step, setStep] = useState<Step>("continent");
  const [continent, setContinent] = useState<ContinentData | null>(null);
  const [country, setCountry] = useState<Country | null>(null);
  const [query, setQuery] = useState("");

  const searching = query.trim().length > 0;
  const results = useMemo(() => searchDestinations(query), [query]);

  function pickContinent(c: ContinentData) {
    setContinent(c);
    setQuery("");
    setStep("country");
  }

  function pickCountry(c: Country) {
    setCountry(c);
    setQuery("");
    setStep("city");
  }

  function pickCity(city: City) {
    if (continent && country) onComplete({ continent, country, city });
  }

  function back() {
    setQuery("");
    if (step === "city") {
      setCountry(null);
      setStep("country");
    } else if (step === "country") {
      setContinent(null);
      setStep("continent");
    }
  }

  const breadcrumb = [
    continent && { label: `${continent.emoji} ${continent.name}`, onClick: () => back() },
    country && step === "city" && { label: `${country.flag} ${country.name}`, onClick: () => back() },
  ].filter(Boolean) as { label: string; onClick: () => void }[];

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl">
      {/* 검색 바 */}
      <div className="relative mb-5">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-primary)]"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="국가 또는 도시를 바로 검색해보세요 (예: 도쿄, 스위스)"
          className="card w-full rounded-full py-3 pl-11 pr-11 text-sm outline-none placeholder:text-slate-400 focus:border-[color:var(--color-primary)]"
        />
        {searching && (
          <button
            aria-label="검색 지우기"
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 브레드크럼 */}
      {!searching && step !== "continent" && (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <button
            onClick={back}
            className="flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 border border-[color:var(--border)] shadow-sm hover:bg-[color:var(--surface-muted)]"
          >
            <ArrowLeft size={14} />
            이전
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {breadcrumb.map((b) => (
              <span key={b.label} className="flex items-center gap-2">
                <ChevronRight size={12} />
                <button onClick={b.onClick} className="hover:text-[color:var(--color-primary-strong)]">
                  {b.label}
                </button>
              </span>
            ))}
            <ChevronRight size={12} />
            <span className="font-semibold text-[color:var(--foreground)]">{stepLabels[step]}</span>
          </div>
        </div>
      )}

      {/* 검색 결과 */}
      {searching ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {results.length === 0 && (
            <p className="col-span-full text-center text-sm text-slate-500 py-8">
              &ldquo;{query}&rdquo; 에 대한 결과가 없어요 🥲
            </p>
          )}
          {results.slice(0, 24).map(({ continent, country, city }) => (
            <motion.button
              key={`${continent.id}-${country.name}-${city.name}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              onClick={() => pickCity(city)}
              className="card flex items-center gap-3 p-4 text-left transition-colors hover:border-[color:var(--color-primary)]"
            >
              <span className="text-2xl">{city.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold truncate">
                  {city.name}{" "}
                  <span className="text-sm font-normal text-slate-500">
                    {country.flag} {country.name}
                  </span>
                </span>
                <span className="block text-xs text-slate-500 truncate">
                  {continent.emoji} {continent.name} · {city.description}
                </span>
              </span>
              <MapPin size={16} className="shrink-0 text-[color:var(--color-accent)]" />
            </motion.button>
          ))}
        </div>
      ) : (
        /* 3단계 카드 UI */
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5"
            >
              {step === "continent" &&
                WORLD.map((c) => (
                  <CardButton
                    key={c.id}
                    emoji={c.emoji}
                    title={c.name}
                    subtitle={`${c.countries.length}개국`}
                    onClick={() => pickContinent(c)}
                    accent="primary"
                  />
                ))}

              {step === "country" &&
                continent?.countries.map((c) => (
                  <CardButton
                    key={c.name}
                    emoji={c.flag}
                    title={c.name}
                    subtitle={`${c.currency} · ${c.cities.length}개 도시`}
                    onClick={() => pickCountry(c)}
                    accent="accent"
                    photoCountry={c.name}
                    continentName={continent.name}
                  />
                ))}

              {step === "city" &&
                country?.cities.map((c) => (
                  <CardButton
                    key={c.name}
                    emoji={c.emoji}
                    title={c.name}
                    subtitle={c.description}
                    onClick={() => pickCity(c)}
                    accent="mint"
                    footer={
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {c.lat.toFixed(1)}°, {c.lng.toFixed(1)}°
                      </span>
                    }
                  />
                ))}
            </motion.div>
          </AnimatePresence>

          {/* 단계 인디케이터 */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {(["continent", "country", "city"] as Step[]).map((s, i) => {
              const order = ["continent", "country", "city"];
              const active = order.indexOf(step) >= i;
              return (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    active ? "w-8 bg-[color:var(--color-primary)]" : "w-3 bg-[color:var(--border)]"
                  }`}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CardButton({
  emoji,
  title,
  subtitle,
  footer,
  onClick,
  accent,
  photoCountry,
  continentName,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  onClick: () => void;
  accent: "primary" | "accent" | "mint";
  /** 지정하면 나라 대표 사진 카드로 렌더링 */
  photoCountry?: string;
  continentName?: string;
}) {
  if (photoCountry) {
    return (
      <motion.button
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-[var(--radius-card)] bg-slate-200 p-3.5 text-left text-white shadow-card md:p-4"
      >
        <CoverPhoto country={photoCountry} continent={continentName} zoomOnHover />
        <span className="relative text-2xl leading-none drop-shadow" role="img" aria-hidden>
          {emoji}
        </span>
        <span className="relative mt-1.5 font-bold">{title}</span>
        <span className="relative text-[11px] text-white/85">{subtitle}</span>
      </motion.button>
    );
  }
  const accentClass =
    accent === "primary"
      ? "group-hover:border-[color:var(--color-primary)] group-hover:bg-[color:var(--color-primary-soft)]"
      : accent === "accent"
        ? "group-hover:border-[color:var(--color-accent)] group-hover:bg-[color:var(--color-accent-soft)]"
        : "group-hover:border-[color:var(--color-mint)] group-hover:bg-emerald-50";
  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`card group relative flex flex-col items-start gap-1 p-4 pt-5 text-left transition-all md:p-5 md:pt-6 ${accentClass}`}
    >
      <span className="absolute right-3 top-3 text-lg opacity-0 transition-opacity group-hover:opacity-100">
        <Check size={16} className="text-[color:var(--color-primary-strong)]" />
      </span>
      <span className="text-3xl leading-none drop-shadow-sm" role="img" aria-hidden>
        {emoji}
      </span>
      <span className="mt-1.5 font-semibold">{title}</span>
      <span className="text-xs text-slate-500 line-clamp-2">{subtitle}</span>
      {footer && <span className="mt-auto pt-1">{footer}</span>}
    </motion.button>
  );
}
