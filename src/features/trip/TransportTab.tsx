"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Repeat } from "lucide-react";
import type { MapPoint, RouteLeg, TravelDoc, Trip, TripDay } from "@/lib/types";
import { usePrefs } from "@/i18n/I18nProvider";
import DayBookings from "@/features/prep/DayBookings";
import { formatDuration, formatTime } from "@/features/route/schedule";
import { planDays, type PlanDay } from "./itinerary";
import { CHIP, ChoiceList, JourneySteps, MoreNote, PayTags, PayTotals, toneOf } from "./MoveParts";
import { dayMoves, movePays, nextMoveOptions, parseJourney, type Move } from "./transport";

/** 교통 탭: Day 마다 하루 시간 막대, 그날 항공·티켓, 이동을 노선도처럼 */
export default function TransportTab({
  trip,
  points,
  legs,
  docs,
  stayByNight,
  dayRecords,
}: {
  trip: Trip;
  points: MapPoint[];
  legs: RouteLeg[];
  docs: TravelDoc[];
  stayByNight: Record<number, string>;
  dayRecords: TripDay[];
}) {
  const { t, locale, df } = usePrefs();
  const days = useMemo(() => {
    const areas = Object.fromEntries(dayRecords.filter((d) => d.area).map((d) => [d.day_number, d.area!])) as Record<number, string>;
    return planDays(trip, points, legs, areas, stayByNight);
  }, [trip, points, legs, stayByNight, dayRecords]);
  const tickets = useMemo(() => docs.filter((d) => d.type === "flight" || d.type === "ticket"), [docs]);
  const allPays = useMemo(() => days.flatMap((d) => dayMoves(d).flatMap(movePays)), [days]);

  return (
    <div className="grid grid-cols-1 items-start gap-4 pb-10 lg:grid-cols-2 lg:gap-6">
      {allPays.length > 0 && (
        <section className="card flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2.5 p-4 md:p-5 lg:col-span-2" aria-label={t("내는 법")}>
          <h3 className="text-base font-extrabold">{t("여행 전체 내는 법")}</h3>
          <div className="flex flex-wrap gap-2">
            <PayTotals pays={allPays} size="md" />
          </div>
        </section>
      )}
      {days.map((day) => {
        const moves = dayMoves(day);
        const total = moves.reduce((s, m) => s + (m.end - m.at), 0);
        const dayPays = moves.flatMap(movePays);
        return (
          <section key={day.day} className="card min-w-0 p-4 md:p-5" aria-label={`Day ${day.day}`}>
            <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h3 className="text-xl font-extrabold tracking-tight">Day {day.day}</h3>
              {day.date && (
                <span className="text-sm font-semibold text-foreground/68">{format(parseISO(day.date), t("M/d(E)"), { locale: df })}</span>
              )}
              {day.area && <span className="text-sm text-foreground/60">{day.area}</span>}
              {total > 0 && (
                <span className="ml-auto text-sm font-bold tabular-nums">{t("이동 {d}", { d: formatDuration(total, locale) })}</span>
              )}
            </header>

            {moves.length > 0 && <DayRibbon day={day} moves={moves} />}

            {dayPays.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t("이날 내는 법")}>
                <PayTotals pays={dayPays} />
              </div>
            )}

            {day.date && (
              <div className="mt-3">
                <DayBookings docs={tickets} date={day.date} />
              </div>
            )}

            {moves.length === 0 ? (
              <p className="mt-3 text-sm text-foreground/60">{t("이날은 이동이 없어요")}</p>
            ) : (
              <ol className="mt-4 space-y-5">
                {moves.map((m) => (
                  <MoveRow key={m.kind === "ride" ? m.point.id : m.leg.id} move={m} />
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** 하루를 가로 막대로: 머무는 시간은 옅게, 이동은 수단 색으로 */
function DayRibbon({ day, moves }: { day: PlanDay; moves: Move[] }) {
  const edges = [
    ...moves.flatMap((m) => [m.at, m.end]),
    ...day.stops.flatMap((s) => [s.arrive, s.leave]),
    ...(day.start ? [day.start.leave] : []),
    ...(day.end?.arrive != null ? [day.end.arrive] : []),
  ];
  const lo = Math.floor(Math.min(...edges) / 60) * 60;
  const hi = Math.max(lo + 60, Math.ceil(Math.max(...edges) / 60) * 60);
  const pct = (x: number) => ((x - lo) / (hi - lo)) * 100;
  const every = hi - lo > 12 * 60 ? 180 : 120;
  const hours = Array.from({ length: Math.floor((hi - lo) / every) + 1 }, (_, i) => lo + i * every);
  const seg = (a: number, b: number) => ({ left: `${pct(a)}%`, width: `max(3px, ${pct(b) - pct(a)}%)` });

  return (
    <div aria-hidden className="mt-3">
      <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-muted">
        {day.stops.map((s) => (
          <span key={s.point.id} className="absolute inset-y-0 bg-foreground/12" style={seg(s.arrive, s.leave)} />
        ))}
        {moves.map((m) => (
          <span key={m.kind === "ride" ? m.point.id : m.leg.id} className={`absolute inset-y-0 ${toneOf(m).bar}`} style={seg(m.at, m.end)} />
        ))}
      </div>
      <div className="relative mt-1 h-3.5 text-[10px] font-semibold tabular-nums text-foreground/55">
        {hours.map((h, i) => (
          <span
            key={h}
            className="absolute"
            style={{ left: `${pct(h)}%`, transform: i === 0 ? "none" : i === hours.length - 1 && h === hi ? "translateX(-100%)" : "translateX(-50%)" }}
          >
            {formatTime(h)}
          </span>
        ))}
      </div>
    </div>
  );
}

function MoveRow({ move: m }: { move: Move }) {
  const { t, locale } = usePrefs();
  const tone = toneOf(m);
  const Icon = tone.icon;
  const journey = m.kind === "ride" ? parseJourney(m.point.memo) : null;
  const choices = m.kind === "leg" ? nextMoveOptions(m.from.memo) : null;
  const rest = journey ? journey.rest : choices?.rest ?? null;
  const steps = journey?.steps ?? [];
  const pays = movePays(m);

  return (
    <li className="grid grid-cols-[3.1rem_1fr] gap-x-3">
      <div className="pt-0.5 text-right tabular-nums">
        <div className="text-base font-extrabold leading-tight">{formatTime(m.at)}</div>
        <div className="text-xs font-semibold text-foreground/55">{formatTime(m.end)}</div>
      </div>

      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <span className={`mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${tone.bar}`}>
            <Icon size={15} aria-hidden />
          </span>
          <h4 className="min-w-0 pt-0.5 font-bold leading-snug [overflow-wrap:anywhere]">
            {m.kind === "ride" ? m.point.name : `${m.from.name} → ${m.to.name}`}
          </h4>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <PayTags pays={pays} />
          <span className={CHIP}>
            {t(tone.label)} · {formatDuration(m.end - m.at, locale)}
          </span>
          {journey && journey.transfers > 0 && (
            <span className={CHIP}>
              <Repeat size={12} aria-hidden />
              {t("환승 {n}회", { n: journey.transfers })}
            </span>
          )}
        </div>

        {steps.length > 1 && (
          <div className="mt-3">
            <JourneySteps steps={steps} tone={tone} />
          </div>
        )}

        {choices && choices.options.length > 0 && (
          <div className="mt-3">
            <ChoiceList options={choices.options} label={t("가는 방법")} />
          </div>
        )}

        {rest && (
          <div className="mt-2.5">
            <MoreNote text={rest} />
          </div>
        )}
      </div>
    </li>
  );
}
