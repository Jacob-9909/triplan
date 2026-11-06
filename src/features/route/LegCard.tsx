"use client";

import { ChevronDown, ExternalLink, PencilLine } from "lucide-react";
import type { MapPoint, RouteLeg, RouteOption, RouteStep } from "@/lib/types";
import { usePrefs } from "@/i18n/I18nProvider";
import { METHOD_META } from "./meta";
import { estimateDirections, legDirectionsUrl } from "./directions";
import { chipMethods, isStale, providerFor } from "./routeOptions";
import { formatDuration } from "./schedule";
import type { RouteStatus } from "./useRouteFetcher";

/** 배경색 위에서 잘 읽히는 글자색 (흰색/검은색) */
function textOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#111827" : "#ffffff";
}

const STEP_LABEL: Record<RouteStep["mode"], string> = { walk: "도보", subway: "지하철", bus: "버스", rail: "기차", other: "기타" };

/**
 * 장소 사이 이동 구간 카드. 접으면 큰 소요 시간 한 줄, 펼치면 이동수단 비교·대중교통 단계·길찾기.
 * 펼친 구간은 지도에서도 다른 이동수단 경로를 흐리게 보여 준다.
 */
export default function LegCard({
  leg,
  from,
  to,
  options,
  status,
  open,
  onToggle,
  onChoose,
  onEdit,
}: {
  leg: RouteLeg;
  from: MapPoint;
  to: MapPoint;
  /** 이 구간의 경로들 */
  options: RouteOption[];
  status: Map<string, RouteStatus>;
  open: boolean;
  onToggle: () => void;
  /** 없으면 보기 전용 */
  onChoose?: (method: RouteLeg["method"]) => void;
  /** 시간·비용 직접 고치기 (편집 권한만) */
  onEdit?: () => void;
}) {
  const { t, locale, money } = usePrefs();
  const fresh = (m: RouteLeg["method"]) => options.find((o) => o.method === m && !isStale(o, from, to));
  const chosen = fresh(leg.method);
  const meta = METHOD_META[leg.method];
  const minutes = leg.duration_min ?? chosen?.duration_min ?? estimateDirections(from, to, leg.method).durationMin;
  const transitInApp = providerFor("transit", from, to) !== null;
  const navUrl = legDirectionsUrl(from, to, leg.method);
  const methodTone = leg.method === "walk" ? "text-foreground/70" : "text-primary-strong";

  return (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition hover:bg-primary-soft"
      >
        <span className="text-xl font-extrabold tabular-nums leading-none">{formatDuration(minutes, locale)}</span>
        <span className={`text-xs font-bold ${methodTone}`}>{t(meta.label)}</span>
        <span className="truncate text-xs text-foreground/68">
          {chosen?.fare_krw ? money(chosen.fare_krw) : chosen ? t("{km}km", { km: chosen.distance_km.toFixed(1) }) : t("추정")}
          {leg.cost != null && leg.cost > 0 && ` · ${money(leg.cost)}`}
        </span>
        <ChevronDown size={14} className={`ml-auto shrink-0 text-foreground/50 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div className="mt-1 space-y-3 rounded-2xl border border-border-subtle bg-surface p-3">
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {chipMethods(leg).map((m) => {
              const opt = fresh(m);
              const st = status.get(`${leg.id}:${m}`);
              const inApp = providerFor(m, from, to) !== null;
              const mins = opt?.duration_min ?? estimateDirections(from, to, m).durationMin;
              const sub =
                st === "loading"
                  ? t("찾는 중…")
                  : st === "quota"
                    ? t("오늘 한도 초과")
                    : st === "failed"
                      ? t("경로 없음")
                      : !opt
                        ? t("추정")
                        : opt.fare_krw
                          ? money(opt.fare_krw)
                          : t("{km}km", { km: opt.distance_km.toFixed(1) });
              const on = m === leg.method;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={!onChoose}
                  onClick={() => onChoose?.(m)}
                  aria-pressed={on}
                  className={`rounded-xl border px-2.5 py-2 text-left transition ${
                    on ? "border-ink bg-ink text-on-ink" : "border-border-subtle enabled:hover:border-primary/50"
                  }`}
                >
                  <span className="block text-lg font-extrabold tabular-nums leading-tight">
                    {/* 경로를 못 찾았으면 추정 시간을 보여 주지 않는다 */}
                    {st === "failed" || st === "quota" ? "–" : formatDuration(mins, locale)}
                  </span>
                  <span className="block text-xs font-bold">{t(METHOD_META[m].label)}</span>
                  <span className={`block truncate text-[11px] ${on ? "text-on-ink/75" : "text-foreground/68"}`}>
                    {m === "transit" && !inApp ? t("추정") : sub}
                  </span>
                </button>
              );
            })}
          </div>

          {leg.method === "transit" && chosen?.steps && (
            <>
              <ol className="space-y-1.5 border-l-2 border-border-subtle pl-3 text-sm">
                {chosen.steps.map((s, i) => (
                  <li key={i} className="flex items-baseline gap-2">
                    <span className="w-14 shrink-0 font-extrabold tabular-nums">{formatDuration(s.minutes, locale)}</span>
                    {s.mode === "walk" ? (
                      <span className="font-bold text-foreground/60">{t("도보")}</span>
                    ) : (
                      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                        <span
                          className="rounded-md px-1.5 py-0.5 text-xs font-bold"
                          style={{ background: s.color ?? "#6b7280", color: textOn(s.color ?? "#6b7280") }}
                        >
                          {s.line ?? t(STEP_LABEL[s.mode])}
                        </span>
                        {s.stops != null && <b>{t("{n}정거장", { n: s.stops })}</b>}
                        {s.from && s.to && (
                          <span className="truncate text-xs text-foreground/68">
                            {s.from} → {s.to}
                          </span>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              <p className="text-[11px] text-foreground/60">powered by www.ODsay.com</p>
            </>
          )}

          <div className="flex flex-wrap gap-1.5">
            {leg.method === "transit" && !transitInApp && (
              <a
                href={legDirectionsUrl(from, to, "transit")!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-strong"
              >
                <ExternalLink size={12} aria-hidden /> {t("구글 지도에서 대중교통 보기")}
              </a>
            )}
            {navUrl && !(leg.method === "transit" && !transitInApp) && (
              <a
                href={navUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground/75"
              >
                <ExternalLink size={12} aria-hidden /> {t("지도 앱에서 열기")}
              </a>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground/75"
              >
                <PencilLine size={12} aria-hidden /> {t("시간·비용 고치기")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
