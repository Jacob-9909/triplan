"use client";

import { motion } from "framer-motion";
import type { MapPoint, RouteLeg, RouteOption } from "@/lib/types";
import { PointBadge } from "@/features/map/pointStyle";
import MoneyInput from "@/features/ui/MoneyInput";
import { usePrefs } from "@/i18n/I18nProvider";
import { estimateDirections } from "./directions";
import { formatDuration } from "./schedule";
import { METHOD_META } from "./meta";

const LEG_METHODS: RouteLeg["method"][] = ["walk", "transit", "taxi", "bike", "rental-car", "plane", "ferry"];
const MINUTE_PRESETS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

/** 구간 편집: 이동수단 · 소요 시간(직접 지정) · 비용 */
export default function LegSheetBody({
  leg,
  points,
  route,
  onChange,
  onChoose,
  onDone,
}: {
  leg: RouteLeg;
  points: MapPoint[];
  /** 지금 이동수단의 실제 경로 (있으면 이 시간이 기준) */
  route?: RouteOption;
  onChange: (id: string, patch: Partial<RouteLeg>) => void;
  onChoose: (id: string, method: RouteLeg["method"]) => void;
  onDone: () => void;
}) {
  const { t, locale } = usePrefs();
  const from = points.find((p) => p.id === leg.from_point_id);
  const to = points.find((p) => p.id === leg.to_point_id);
  if (!from || !to) return null;
  const est = estimateDirections(from, to, leg.method);
  /** 직접 고치기 전의 기준 시간: 실제 경로가 있으면 그 시간, 없으면 추정치 */
  const baseline = route?.duration_min ?? est.durationMin;
  const minutes = leg.duration_min ?? baseline;
  // 직접 고친 시간은 경로를 다시 받아도 덮어쓰지 않는다
  const setMinutes = (m: number) =>
    onChange(leg.id, { duration_min: Math.max(0, Math.min(24 * 60, Math.round(m))), duration_manual: true });

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <PointBadge point={from} size={26} /> <span className="truncate">{from.name}</span>
        <span className="text-foreground/68">→</span>
        <PointBadge point={to} size={26} /> <span className="truncate">{to.name}</span>
      </p>

      <section>
        <h4 className="mb-2 text-xs font-bold text-foreground/65">{t("이동수단")}</h4>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          {LEG_METHODS.map((m) => {
            const meta = METHOD_META[m];
            const Icon = meta.icon;
            const on = m === leg.method;
            return (
              <motion.button
                key={m}
                type="button"
                whileTap={{ scale: 0.92 }}
                // 이동수단을 바꾸면 그 수단의 실제 경로(없으면 추정) 시간으로 다시 채운다 (이후 직접 조정 가능)
                onClick={() => onChoose(leg.id, m)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[11px] font-semibold transition ${
                  on ? "border-primary bg-primary text-white shadow-sm" : "border-border-subtle text-foreground/72 hover:border-primary/40"
                }`}
              >
                <Icon size={18} />
                {t(meta.label)}
              </motion.button>
            );
          })}
        </div>
      </section>

      <section>
        <h4 className="mb-2 flex items-center justify-between text-xs font-bold text-foreground/65">
          {t("소요 시간")}
          <span className="font-medium text-foreground/68">{t("거리 약 {km}km", { km: est.distanceKm })}</span>
        </h4>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setMinutes(minutes - 5)}
            aria-label={t("5분 줄이기")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-xl font-bold text-foreground/72 active:scale-90"
          >
            −
          </button>
          <div className="min-w-32 text-center">
            <p className="text-3xl font-extrabold tabular-nums">{formatDuration(minutes, locale)}</p>
            <p className="text-[11px] text-foreground/68">
              {leg.duration_manual
                ? t(route ? "실제 경로 {time}" : "추정 {time}", { time: formatDuration(baseline, locale) })
                : t(route ? "실제 경로 기준" : "추정치")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMinutes(minutes + 5)}
            aria-label={t("5분 늘리기")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-xl font-bold text-foreground/72 active:scale-90"
          >
            +
          </button>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {MINUTE_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                minutes === m ? "bg-ink text-on-ink" : "bg-surface-muted text-foreground/72 hover:bg-primary-soft"
              }`}
            >
              {formatDuration(m, locale)}
            </button>
          ))}
          {leg.duration_manual && (
            <button
              type="button"
              onClick={() => onChange(leg.id, { duration_min: baseline, duration_manual: false })}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary-strong hover:bg-primary-soft"
            >
              {t(route ? "경로 시간으로" : "추정치로")}
            </button>
          )}
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-bold text-foreground/65">{t("이동 비용")}</h4>
        <MoneyInput value={leg.cost} onChange={(cost) => onChange(leg.id, { cost })} />
      </section>

      <p className="text-xs leading-relaxed text-foreground/68">
        {t("추정 시간은 직선거리와 이동수단별 평균 속도로 계산해요. 실제와 다르면 직접 맞춰 주세요. 타임테이블과 하루 합계에 바로 반영돼요.")}
      </p>
      <button onClick={onDone} className="btn btn-primary w-full py-3 text-sm">
        {t("완료")}
      </button>
    </div>
  );
}
