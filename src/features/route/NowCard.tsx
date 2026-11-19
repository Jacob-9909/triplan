"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Navigation, Sparkles } from "lucide-react";
import type { MapPoint, RouteLeg } from "@/lib/types";
import { PointBadge } from "@/features/map/pointStyle";
import type { PlanDay } from "@/features/trip/itinerary";
import { CHIP, ChoiceList, JourneySteps, PayTag, toneOf } from "@/features/trip/MoveParts";
import { boardingStep, dayMoves, movePays, nextMove, nextMoveOptions, parseJourney, upcomingStep, type Pay } from "@/features/trip/transport";
import { buildSchedule, formatDuration, formatTime } from "./schedule";
import { directionsUrl, legDirectionsUrl } from "./directions";
import { usePrefs } from "@/i18n/I18nProvider";

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** 여행 중 오늘 Day 위에 뜨는 카드: 곧 탈 이동이 있으면 무엇을 타고 무엇을 찍는지, 아니면 지금 있을 곳·다음 장소 + 길찾기 */
export default function NowCard({
  points,
  legs,
  startTravel = 0,
  planDay,
}: {
  points: MapPoint[];
  legs: RouteLeg[];
  /** 숙소에서 첫 장소까지(분) */
  startTravel?: number;
  /** 그날 일정(이동을 고르는 데 쓴다) */
  planDay?: PlanDay;
}) {
  const { t, locale } = usePrefs();
  // ponytail: 기기 시계 기준. 여행지에 있으면 폰 시각이 현지 시각이다
  const [now, setNow] = useState(nowMinutes);
  useEffect(() => {
    const id = setInterval(() => setNow(nowMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);

  const schedule = useMemo(() => buildSchedule(points, legs, startTravel), [points, legs, startTravel]);
  const moves = useMemo(() => (planDay ? dayMoves(planDay) : []), [planDay]);
  if (points.length === 0) return null;

  const upcoming = nextMove(moves, now);
  if (upcoming) return <MoveNow next={upcoming} now={now} />;

  const current = points.find((p) => {
    const st = schedule.get(p.id)!;
    return st.arrive <= now && now < st.leave;
  });
  const next = points.find((p) => schedule.get(p.id)!.arrive > now);

  if (!current && !next) {
    return (
      <div className="card flex items-center gap-3 p-4 text-sm">
        <Sparkles size={18} className="shrink-0 text-mint" />
        <span>{t("오늘 일정을 다 돌았어요. 기록 탭에 오늘 하루를 남겨 보세요.")}</span>
      </div>
    );
  }

  const target = current ?? next!;
  const st = schedule.get(target.id)!;
  return (
    <div className="card flex items-center gap-3 p-4">
      <PointBadge point={target} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-mint">{current ? t("지금") : t("다음")}</p>
        <p className="truncate font-bold">{target.name}</p>
        <p className="text-xs tabular-nums text-foreground/68">
          {current
            ? t("{time}까지 · {left} 남음", { time: formatTime(st.leave), left: formatDuration(st.leave - now, locale) })
            : t("{time} 도착 예정 · {left} 후", { time: formatTime(st.arrive), left: formatDuration(st.arrive - now, locale) })}
        </p>
      </div>
      <a
        href={directionsUrl(target)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary shrink-0 px-4 text-sm"
      >
        <Navigation size={15} /> {t("길찾기")}
      </a>
    </div>
  );
}

/** 개찰구·택시에서 할 일: 이코카 찍기, e티켓 QR, GO 앱으로 부르기 */
function payAction(p: Pay, t: (s: string) => string): string {
  if (p.kind === "ic") return t("이코카 찍기");
  if (p.kind === "ticket") return `${p.label ?? t("e티켓")} QR`;
  return p.label === "GO" ? t("GO 앱으로 부르기") : t("카드·현금");
}

/** 다음 이동 카드: 출발 시각·처음 타는 역과 노선(현지 표기 그대로)·찍을 것을 크게, 타는 중이면 다음 단계와 환승 순서 */
function MoveNow({ next, now }: { next: NonNullable<ReturnType<typeof nextMove>>; now: number }) {
  const { t, locale } = usePrefs();
  const [open, setOpen] = useState(false);
  const m = next.move;
  const tone = toneOf(m);
  const Icon = tone.icon;
  const journey = m.kind === "ride" ? parseJourney(m.point.memo) : null;
  const steps = journey && journey.steps.length > 1 ? journey.steps : [];
  const board = boardingStep(steps);
  const up = next.phase === "riding" ? upcomingStep(steps, now) : null;
  const transfers = journey?.transfers ?? 0;
  const choices = m.kind === "leg" ? (nextMoveOptions(m.from.memo)?.options ?? []) : [];
  const title = m.kind === "ride" ? m.point.name : `${m.from.name} → ${m.to.name}`;
  const nav = m.kind === "ride" ? directionsUrl(m.point) : (legDirectionsUrl(m.from, m.to, m.leg.method) ?? directionsUrl(m.to));
  const left = formatDuration(next.minutes, locale);

  return (
    <section className="card p-4" aria-label={t("다음 이동")}>
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${tone.bar}`}>
          <Icon size={16} aria-hidden />
        </span>
        <p className="text-sm font-bold text-mint">
          {next.phase === "soon" ? t("다음 이동 · {left} 뒤 출발", { left }) : t("이동 중 · {left} 남음", { left })}
        </p>
        <span className="ml-auto text-[11px] font-semibold text-foreground/55">{t("계획 시각")}</span>
      </div>

      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-extrabold tabular-nums">{board?.time ?? formatTime(m.at)}</span>
        <span className="min-w-0 text-base font-bold [overflow-wrap:anywhere]">{board ? board.text : title}</span>
      </p>
      {board && <p className="mt-0.5 text-xs text-foreground/68 [overflow-wrap:anywhere]">{title}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {movePays(m).map((p, i) => (
          <PayTag key={i} kind={p.kind} size="md">
            {payAction(p, t)}
            {p.amount && <span className="font-extrabold">{p.amount}</span>}
          </PayTag>
        ))}
        {m.kind === "leg" && (
          <span className={CHIP}>
            {t(tone.label)} · {formatDuration(m.end - m.at, locale)}
          </span>
        )}
      </div>

      {up && (
        <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2 text-sm [overflow-wrap:anywhere]">
          <span className="font-bold">{t("다음")}</span> <b className="tabular-nums">{steps[up.index].time}</b> {steps[up.index].text}
          {up.transfersDone < transfers && (
            <span className="ml-2 text-xs font-semibold text-foreground/60">
              {t("환승 {i}/{n}", { i: up.transfersDone + 1, n: transfers })}
            </span>
          )}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(steps.length > 1 || choices.length > 0) && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary-soft px-3 text-xs font-semibold text-primary-strong"
          >
            {steps.length > 1 ? t("전체 경로") : t("다른 방법")}
            <ChevronDown size={13} className={`transition ${open ? "rotate-180" : ""}`} aria-hidden />
          </button>
        )}
        {nav && (
          <a href={nav} target="_blank" rel="noopener noreferrer" className="btn btn-primary ml-auto shrink-0 px-4 text-sm">
            <Navigation size={15} /> {t("길찾기")}
          </a>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-2.5">
          {steps.length > 1 && <JourneySteps steps={steps} tone={tone} current={up?.index} />}
          {choices.length > 0 && <ChoiceList options={choices} label={t("가는 방법")} />}
        </div>
      )}
    </section>
  );
}
