"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, CreditCard, Plane, Repeat, Ticket, TrainFront, Wallet, type LucideIcon } from "lucide-react";
import type { MapPoint, RouteLeg, TravelDoc, Trip, TripDay } from "@/lib/types";
import { usePrefs } from "@/i18n/I18nProvider";
import DayBookings from "@/features/prep/DayBookings";
import { METHOD_META } from "@/features/route/meta";
import { formatDuration, formatTime } from "@/features/route/schedule";
import { planDays, type PlanDay } from "./itinerary";
import { dayMoves, movePays, nextMoveOptions, parseJourney, payTotals, type Move, type Pay, type PayKind } from "./transport";

interface Tone {
  icon: LucideIcon;
  label: string;
  /** 막대·노선 색 */
  bar: string;
  /** 노선 중간 역 테두리 */
  ring: string;
}

/** 수단별 색은 일정 탭 구간 칩(METHOD_META.activeClass)과 같은 토큰 */
const LEG_TONE: Record<RouteLeg["method"], Pick<Tone, "bar" | "ring">> = {
  walk: { bar: "bg-primary", ring: "border-primary" },
  transit: { bar: "bg-mint", ring: "border-mint" },
  taxi: { bar: "bg-sand", ring: "border-sand" },
  "rental-car": { bar: "bg-violet", ring: "border-violet" },
  bike: { bar: "bg-accent", ring: "border-accent" },
  plane: { bar: "bg-primary-strong", ring: "border-primary-strong" },
  ferry: { bar: "bg-primary", ring: "border-primary" },
};

function toneOf(m: Move): Tone {
  if (m.kind === "leg") return { icon: METHOD_META[m.leg.method].icon, label: METHOD_META[m.leg.method].label, ...LEG_TONE[m.leg.method] };
  // ponytail: 이름으로 공항 여부를 본다. 교통 장소에 세부 종류가 생기면 그걸 쓴다
  const air = /공항|空港|KIX|airport/i.test(m.point.name); // i18n-ignore
  return { icon: air ? Plane : TrainFront, label: air ? "공항" : "열차", bar: "bg-violet", ring: "border-violet" };
}

const CHIP = "inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-foreground/80";

/** 내는 법: 교통카드, 미리 산 티켓, 택시(카드·현금) */
const PAY_META: Record<PayKind, { icon: LucideIcon; label: string; bg: string }> = {
  ic: { icon: CreditCard, label: "이코카", bg: "bg-mint" },
  ticket: { icon: Ticket, label: "e티켓", bg: "bg-violet" },
  cash: { icon: Wallet, label: "카드·현금", bg: "bg-sand" },
};

/** 결제 태그: 일반 칩(회색)과 달리 테두리와 수단 색 아이콘으로 눈에 띄게 */
function PayTag({ kind, children, size = "sm" }: { kind: PayKind; children: React.ReactNode; size?: "sm" | "md" }) {
  const meta = PAY_META[kind];
  const Icon = meta.icon;
  const md = size === "md";
  return (
    <span
      className={`inline-flex items-center rounded-lg border border-border-subtle bg-surface font-bold tabular-nums ${
        md ? "gap-2 py-1 pl-1 pr-3 text-sm" : "gap-1.5 py-0.5 pl-0.5 pr-2 text-xs"
      }`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-md text-white ${meta.bg} ${md ? "h-7 w-7" : "h-5 w-5"}`}>
        <Icon size={md ? 15 : 12} aria-hidden />
      </span>
      {children}
    </span>
  );
}

/** 수단별 합계 태그들. 금액을 모르면 이름만 */
function PayTotals({ pays, size }: { pays: Pay[]; size?: "sm" | "md" }) {
  const { t } = usePrefs();
  const tot = payTotals(pays);
  const yen = (lo: number, hi: number) =>
    lo === hi ? t("약 {n}엔", { n: lo.toLocaleString() }) : t("약 {lo}~{hi}엔", { lo: lo.toLocaleString(), hi: hi.toLocaleString() });
  const tickets = [...new Set(tot.tickets)].map((label) => ({ label, n: tot.tickets.filter((x) => x === label).length }));
  return (
    <>
      {tot.ic.count > 0 && (
        <PayTag kind="ic" size={size}>
          {t(PAY_META.ic.label)} {tot.ic.hi > 0 && <span className="font-extrabold">{yen(tot.ic.lo, tot.ic.hi)}</span>}
        </PayTag>
      )}
      {tickets.map(({ label, n }) => (
        <PayTag key={label} kind="ticket" size={size}>
          {label || t(PAY_META.ticket.label)} {n > 1 && t("{n}장", { n })}
        </PayTag>
      ))}
      {tot.cash.count > 0 && (
        <PayTag kind="cash" size={size}>
          {t(PAY_META.cash.label)} {tot.cash.hi > 0 && <span className="font-extrabold">{yen(tot.cash.lo, tot.cash.hi)}</span>}
        </PayTag>
      )}
    </>
  );
}

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
          {pays.map((p, i) => (
            <PayTag key={i} kind={p.kind}>
              {p.label ?? t(PAY_META[p.kind].label)}
              {p.amount && <span className="font-extrabold">{p.amount}</span>}
            </PayTag>
          ))}
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
          <ol className="relative mt-3 space-y-2 pl-6" aria-label={t("경로")}>
            <span aria-hidden className={`absolute bottom-2 left-[7px] top-2 w-0.5 rounded-full ${tone.bar}`} />
            {steps.map((s, i) => {
              const end = i === 0 || i === steps.length - 1;
              return (
                <li key={i} className="relative flex gap-2 text-[13px] leading-snug">
                  <span
                    aria-hidden
                    className={`absolute -left-6 top-0.5 h-4 w-4 rounded-full border-[3px] ${end ? `${tone.bar} border-surface` : `bg-surface ${tone.ring}`}`}
                  />
                  <span className="w-10 shrink-0 font-bold tabular-nums">{s.time}</span>
                  <span className="min-w-0 text-foreground/85 [overflow-wrap:anywhere]">{s.text}</span>
                </li>
              );
            })}
          </ol>
        )}

        {choices && choices.options.length > 0 && (
          <ol className="mt-3 space-y-1.5" aria-label={t("가는 방법")}>
            {choices.options.map((o, i) => (
              <li key={i} className="flex gap-2 rounded-xl bg-surface-muted px-2.5 py-1.5 text-[13px] leading-snug">
                <span className="font-extrabold tabular-nums text-foreground/55">{i + 1}</span>
                <span className="min-w-0">{o}</span>
              </li>
            ))}
          </ol>
        )}

        {rest && (
          <details className="group mt-2.5">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full text-xs font-semibold text-foreground/65 hover:text-foreground [&::-webkit-details-marker]:hidden">
              {t("팁·대안")}
              <ChevronDown size={13} className="transition group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/75">{rest}</p>
          </details>
        )}
      </div>
    </li>
  );
}
