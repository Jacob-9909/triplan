"use client";

import { ArrowLeft, Footprints, Sun } from "lucide-react";
import type { MapPoint } from "@/lib/types";
import { usePrefs } from "@/i18n/I18nProvider";
import type { AreaGroup, LoosePlace } from "./areas";
import { formatDuration } from "./schedule";

/** 구역 색 (분류별 핀 색과 겹치지 않게). 애매한 곳은 회색 */
// 구역 색이자 전체 일정 보기의 Day 색. 8일이 넘으면 다시 돈다
export const AREA_COLORS = ["#e0782f", "#2f6fdf", "#2a9d6a", "#a855f7", "#db2777", "#0891b2", "#ca8a04", "#4338ca"];
export const LOOSE_COLOR = "#9ca3af";

/**
 * 후보함 구역 제안: 걸어서 다닐 만한 곳끼리 묶은 카드. Day 를 고르면 그 구역 장소가 통째로 옮겨진다.
 * 어디에도 안 맞는 곳은 "애매한 곳" 으로 따로 둔다.
 */
export default function AreaGroups({
  groups,
  loose,
  names,
  error,
  days,
  busy,
  onMove,
  onOpen,
  onClose,
}: {
  groups: AreaGroup[];
  loose: LoosePlace[];
  /** 구역 이름. 아직 짓는 중이면 undefined, 못 지었으면 null */
  names: (string | null | undefined)[];
  /** 구역 옮기기 실패 메시지 */
  error?: string | null;
  /** 고를 수 있는 Day: 번호와 표시 이름 */
  days: { day: number; label: string }[];
  /** 옮기는 중인 구역 */
  busy: number | null;
  onMove: (groupIndex: number, day: number) => void;
  onOpen: (point: MapPoint) => void;
  onClose: () => void;
}) {
  const { t, locale } = usePrefs();
  const nameOf = (i: number) => names[i] ?? t("구역 {n}", { n: i + 1 });

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3.5 md:px-5">
        <div className="min-w-0">
          <h3 className="text-base font-bold">{t("구역 제안")}</h3>
          <p className="mt-0.5 text-xs text-foreground/68">{t("걸어서 다닐 만한 곳끼리 묶었어요. Day를 고르면 구역째 옮겨요")}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-strong hover:bg-primary-soft"
        >
          <ArrowLeft size={14} aria-hidden /> {t("목록으로")}
        </button>
      </header>

      <div className="space-y-2.5 p-3 md:p-4">
        {error && (
          <p role="alert" className="rounded-xl bg-accent-soft px-3 py-2 text-xs font-semibold text-accent">
            {error}
          </p>
        )}
        {groups.length === 0 && <p className="px-1 py-4 text-center text-sm text-foreground/68">{t("묶을 만큼 가까운 곳이 없어요")}</p>}
        {groups.map((g, i) => (
          <article key={g.points[0].id} className="rounded-2xl border border-border-subtle bg-surface p-3.5">
            <h4 className="flex items-center gap-2 text-[15px] font-extrabold">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: AREA_COLORS[i % AREA_COLORS.length] }} aria-hidden />
              <span className="truncate">{nameOf(i)}</span>
              {names[i] === undefined && <span className="text-xs font-medium text-foreground/50">{t("이름 짓는 중…")}</span>}
              <span className="text-xs font-semibold text-foreground/60">{t("{n}곳", { n: g.points.length })}</span>
            </h4>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-foreground/68">
              <span className="flex items-center gap-1.5">
                <Footprints size={14} aria-hidden />
                <b className="text-lg font-extrabold tabular-nums text-foreground">{formatDuration(g.avgWalkMin, locale)}</b>
                {t("장소 사이 평균 도보")}
              </span>
              <span className="flex items-center gap-1.5">
                <Sun size={14} aria-hidden />
                <b className="text-lg font-extrabold tabular-nums text-foreground">
                  {t("약 {time}", { time: formatDuration(g.dayMin, locale) })}
                </b>
                {t("머무는 시간 포함 하루 분량")}
              </span>
            </div>
            {g.tooLong && <p className="mt-1.5 text-xs font-semibold text-accent">{t("하루보다 길어요")}</p>}
            <p className="mt-2 text-[13px] leading-relaxed">{g.points.map((p) => p.name).join(" · ")}</p>
            <select
              aria-label={t("{area}을(를) 옮길 Day", { area: nameOf(i) })}
              disabled={busy !== null || days.length === 0}
              value=""
              onChange={(e) => e.target.value && onMove(i, Number(e.target.value))}
              className="mt-3 rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              <option value="">{busy === i ? t("옮기는 중…") : t("Day 고르기")}</option>
              {days.map((d) => (
                <option key={d.day} value={d.day}>
                  {d.label}
                </option>
              ))}
            </select>
          </article>
        ))}

        {loose.length > 0 && (
          <article className="rounded-2xl border border-dashed border-border-subtle bg-surface-muted p-3.5">
            <h4 className="text-[15px] font-extrabold">
              {t("애매한 곳")} <span className="text-xs font-semibold text-foreground/60">{t("{n}곳", { n: loose.length })}</span>
            </h4>
            <ul className="mt-2 space-y-1.5 text-[13px]">
              {loose.map((l) => (
                <li key={l.point.id}>
                  <button type="button" onClick={() => onOpen(l.point)} className="font-bold hover:underline">
                    {l.point.name}
                  </button>{" "}
                  <span className="text-foreground/68">
                    ·{" "}
                    {l.nearestPlace && l.walkMin !== null
                      ? t("{place} 근처 (도보 {time})", {
                          place: l.nearestGroup !== null ? nameOf(l.nearestGroup) : l.nearestPlace.name,
                          time: formatDuration(l.walkMin, locale),
                        })
                      : t("다른 곳과 멀어요")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-foreground/60">{t("장소를 눌러 직접 Day로 옮기세요")}</p>
          </article>
        )}
      </div>
    </section>
  );
}
