"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import type { City } from "@/data/world";
import CoverPhoto from "@/features/ui/CoverPhoto";
import { useT } from "@/i18n/I18nProvider";
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
  const t = useT();
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
    continent && { label: t(continent.name), onClick: () => back() },
    country && step === "city" && { label: t(country.name), onClick: () => back() },
  ].filter(Boolean) as { label: string; onClick: () => void }[];

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl">
      {/* 검색 바 */}
      <label htmlFor="dest-search" className="sr-only">
        {t("나라나 도시 검색")}
      </label>
      <div className="relative mb-5">
        <Search size={18} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/68" />
        <input
          id="dest-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("나라나 도시 이름 (예: 도쿄, 스위스)")}
          className="input rounded-full py-3 pl-11 pr-11 shadow-card"
        />
        {searching && (
          <button
            aria-label={t("검색 지우기")}
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground/68 hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 단계 표시 */}
      {!searching && (
        <ol className="mb-5 flex items-center gap-2 text-sm" aria-label={t("선택 단계")}>
          {step !== "continent" && (
            <li>
              <button onClick={back} className="btn btn-ghost mr-1 px-3 text-sm">
                <ArrowLeft size={14} aria-hidden /> {t("이전")}
              </button>
            </li>
          )}
          {breadcrumb.map((b) => (
            <li key={b.label} className="flex items-center gap-2 text-foreground/65">
              <button onClick={b.onClick} className="font-semibold hover:text-foreground">
                {b.label}
              </button>
              <ChevronRight size={13} aria-hidden />
            </li>
          ))}
          <li aria-current="step" className="font-bold text-foreground">
            {t(stepLabels[step])}
          </li>
          <li className="ml-auto flex items-center gap-1.5" aria-hidden>
            {(["continent", "country", "city"] as Step[]).map((s, i) => {
              const active = ["continent", "country", "city"].indexOf(step) >= i;
              return (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${active ? "w-6 bg-primary" : "w-2.5 bg-border-subtle"}`}
                />
              );
            })}
          </li>
        </ol>
      )}

      {/* 검색 결과 */}
      {searching ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
          {results.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-foreground/65">
              {t("“{query}”에 맞는 곳이 없어요. 나라 이름으로 찾아보세요.", { query })}
            </p>
          )}
          {results.slice(0, 24).map(({ continent, country, city }) => (
            <motion.button
              key={`${continent.id}-${country.name}-${city.name}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                setContinent(continent);
                setCountry(country);
                onComplete({ continent, country, city });
              }}
              className="card flex items-center gap-3 p-2.5 pr-4 text-left transition-colors hover:border-foreground/30"
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
                <CoverPhoto country={country.name} continent={continent.name} city={city.name} scrim={false} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{t(city.name)}</span>
                <span className="block truncate text-xs text-foreground/65">
                  {t(country.name)} · {t(city.description)}
                </span>
              </span>
              <ChevronRight size={16} aria-hidden className="shrink-0 text-foreground/40" />
            </motion.button>
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4"
          >
            {step === "continent" &&
              WORLD.map((c) => (
                <PhotoTile
                  key={c.id}
                  title={t(c.name)}
                  subtitle={t("{n}개 나라", { n: c.countries.length })}
                  onClick={() => pickContinent(c)}
                  country={c.countries[0]?.name}
                  continentName={c.name}
                />
              ))}

            {step === "country" &&
              continent?.countries.map((c) => (
                <PhotoTile
                  key={c.name}
                  title={t(c.name)}
                  subtitle={t("{currency} · 도시 {n}곳", { currency: c.currency, n: c.cities.length })}
                  onClick={() => pickCountry(c)}
                  country={c.name}
                  continentName={continent.name}
                />
              ))}

            {step === "city" &&
              country?.cities.map((c) => (
                <PhotoTile
                  key={c.name}
                  title={t(c.name)}
                  subtitle={t(c.description)}
                  onClick={() => pickCity(c)}
                  country={country.name}
                  city={c.name}
                  continentName={continent?.name}
                />
              ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

/** 사진 카드 버튼. 도시 사진 → 나라 사진 → 대륙 그라디언트 순으로 깐다 */
function PhotoTile({
  title,
  subtitle,
  onClick,
  country,
  city,
  continentName,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  country?: string;
  city?: string;
  continentName?: string;
}) {
  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-[var(--radius-card)] bg-surface-muted p-3.5 text-left text-white shadow-card md:p-4"
    >
      <CoverPhoto country={country} city={city} continent={continentName} zoomOnHover />
      <span className="relative text-base font-bold leading-tight md:text-lg">{title}</span>
      <span className="relative mt-0.5 line-clamp-1 text-xs text-white/85">{subtitle}</span>
    </motion.button>
  );
}
