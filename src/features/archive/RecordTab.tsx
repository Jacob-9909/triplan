"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { addDays, format, parseISO } from "date-fns";
import { Cloud, CloudRain, Coins, Footprints, MapPin, Snowflake, Star, Sun, Wallet, Wind, type LucideIcon } from "lucide-react";
import type { Expense, MapPoint, Mood, RouteLeg, Trip, TripDay, Weather } from "@/lib/types";
import { apiGet, apiPost } from "@/lib/api";
import { useTripChanges } from "@/lib/realtime";
import { PointBadge } from "@/features/map/pointStyle";
import { categoryMeta } from "@/features/expenses/categories";
import { formatRange, nights } from "@/features/ui/dates";
import type { PointPatch } from "@/features/trip/PlaceDetail";
import { usePrefs, useT } from "@/i18n/I18nProvider";
import TripStamp from "./TripStamp";
import { tripStats } from "./stats";

const WEATHER: { id: Weather; label: string; icon: LucideIcon }[] = [
  { id: "sunny", label: "맑음", icon: Sun },
  { id: "cloudy", label: "흐림", icon: Cloud },
  { id: "rain", label: "비", icon: CloudRain },
  { id: "snow", label: "눈", icon: Snowflake },
  { id: "wind", label: "바람", icon: Wind },
];

const MOOD: { id: Mood; label: string; emoji: string }[] = [
  { id: "great", label: "최고", emoji: "🤩" },
  { id: "good", label: "좋음", emoji: "😊" },
  { id: "okay", label: "보통", emoji: "🙂" },
  { id: "tired", label: "피곤", emoji: "😪" },
  { id: "bad", label: "별로", emoji: "😞" },
];

type DayPatch = Partial<Pick<TripDay, "weather" | "mood" | "note">>;

function useTripDays(tripId: string) {
  const [days, setDays] = useState<TripDay[]>([]);
  useEffect(() => {
    apiGet<TripDay[]>(`/api/trip-days?trip_id=${tripId}`).then(setDays).catch(() => null);
  }, [tripId]);
  useTripChanges(tripId, ["trip_days"], () => {
    apiGet<TripDay[]>(`/api/trip-days?trip_id=${tripId}`).then(setDays).catch(() => null);
  });

  async function save(dayNumber: number, patch: DayPatch) {
    const prev = days.find((d) => d.day_number === dayNumber);
    // 서버는 한 줄을 통째로 덮어쓰므로 나머지 값도 함께 보낸다
    const next = { weather: prev?.weather ?? null, mood: prev?.mood ?? null, note: prev?.note ?? null, ...patch };
    setDays((list) => [
      ...list.filter((d) => d.day_number !== dayNumber),
      { id: prev?.id ?? `tmp-${dayNumber}`, trip_id: tripId, day_number: dayNumber, ...next },
    ]);
    try {
      const saved = await apiPost<TripDay>("/api/trip-days", { trip_id: tripId, day_number: dayNumber, ...next });
      setDays((list) => list.map((d) => (d.day_number === dayNumber ? saved : d)));
    } catch {
      setDays((list) => [...list.filter((d) => d.day_number !== dayNumber), ...(prev ? [prev] : [])]);
    }
  }

  return { days, save };
}

/** 다녀온 여행의 기록: 도장 · 통계 · 하루 일기 · 장소 평점 */
export default function RecordTab({
  trip,
  points,
  legs,
  expenses,
  canEdit,
  onSavePoint,
}: {
  trip: Trip;
  points: MapPoint[];
  legs: RouteLeg[];
  expenses: Expense[];
  canEdit: boolean;
  onSavePoint: (id: string, patch: PointPatch) => Promise<string | null>;
}) {
  const { t, locale, money } = usePrefs();
  const { days, save } = useTripDays(trip.id);
  const n = nights(trip);
  const dayCount = n !== null ? n + 1 : Math.max(1, ...points.map((p) => p.day_number ?? 1));
  const stats = useMemo(() => tripStats(points, legs, expenses, dayCount), [points, legs, expenses, dayCount]);

  const dayList = Array.from({ length: dayCount }, (_, i) => i + 1).filter((d) => {
    if (canEdit) return true;
    const rec = days.find((x) => x.day_number === d);
    return rec?.note || rec?.weather || rec?.mood || points.some((p) => p.day_number === d);
  });

  return (
    <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
      <div className="space-y-4 lg:col-span-2">
        <section className="card flex flex-col items-center px-5 py-6 text-center">
          <TripStamp trip={trip} className="h-40 w-40" />
          <h2 className="mt-3 text-lg font-bold">{trip.title}</h2>
          <p className="text-sm text-foreground/65">{formatRange(trip, locale)}</p>
        </section>

        <section className="card p-4">
          <h3 className="mb-3 text-sm font-bold">{t("이번 여행 숫자로 보기")}</h3>
          <dl className="grid grid-cols-2 gap-2">
            <Tile icon={MapPin} label={t("방문한 곳")} value={t("{n}곳", { n: stats.places })} />
            <Tile icon={Footprints} label={t("이동 거리")} value={`${stats.distanceKm.toLocaleString()}km`} />
            <Tile icon={Wallet} label={t("총 지출")} value={money(stats.spendKrw)} />
            <Tile icon={Coins} label={t("하루 평균")} value={money(stats.perDayKrw)} />
          </dl>
          {(stats.topDay || stats.topCategory) && (
            <ul className="mt-3 space-y-1.5 text-sm text-foreground/72">
              {stats.topDay && (
                <li>
                  <Emphasis
                    text={t("가장 많이 쓴 날은 {b} ({amount})", { amount: money(stats.topDay.krw) })}
                    bold={`Day ${stats.topDay.day}`}
                  />
                </li>
              )}
              {stats.topCategory && (
                <li>
                  <Emphasis
                    text={t("가장 많이 쓴 곳은 {b} ({amount})", { amount: money(stats.topCategory.krw) })}
                    bold={t(categoryMeta(stats.topCategory.category).label)}
                  />
                </li>
              )}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-foreground/68">{t("이동 거리는 하루 동선의 구간 거리 합이에요. 모르는 구간은 직선거리로 추정해요.")}</p>
        </section>
      </div>

      <div className="space-y-4 lg:col-span-3">
        {dayList.length === 0 && (
          <p className="card py-10 text-center text-sm text-foreground/68">{t("아직 남긴 기록이 없어요")}</p>
        )}
        {dayList.map((d, i) => (
          <DayCard
            key={d}
            day={d}
            index={i}
            date={trip.start_date ? addDays(parseISO(trip.start_date), d - 1) : null}
            record={days.find((x) => x.day_number === d)}
            points={points
              .filter((p) => p.day_number === d)
              .sort((a, b) => (a.visit_order ?? 99) - (b.visit_order ?? 99))}
            canEdit={canEdit}
            onSaveDay={(patch) => void save(d, patch)}
            onSavePoint={onSavePoint}
          />
        ))}
      </div>
    </div>
  );
}

/** 번역문의 {b} 자리를 굵게 */
function Emphasis({ text, bold }: { text: string; bold: string }) {
  const [before, after] = text.split("{b}");
  return (
    <>
      {before}
      <b className="text-foreground">{bold}</b>
      {after}
    </>
  );
}

function Tile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-2.5">
      <dt className="flex items-center gap-1 text-[11px] font-semibold text-foreground/68">
        <Icon size={12} aria-hidden /> {label}
      </dt>
      <dd className="mt-0.5 truncate text-base font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function DayCard({
  day,
  index,
  date,
  record,
  points,
  canEdit,
  onSaveDay,
  onSavePoint,
}: {
  day: number;
  index: number;
  date: Date | null;
  record: TripDay | undefined;
  points: MapPoint[];
  canEdit: boolean;
  onSaveDay: (patch: DayPatch) => void;
  onSavePoint: (id: string, patch: PointPatch) => Promise<string | null>;
}) {
  const { t, df } = usePrefs();
  const [note, setNote] = useState(record?.note ?? "");
  // 다른 사람이 고친 일기를 받으면 반영한다 (내가 쓰는 중이 아닐 때)
  const [focused, setFocused] = useState(false);
  const remote = record?.note ?? "";
  if (!focused && note !== remote) setNote(remote);

  const weather = WEATHER.find((w) => w.id === record?.weather);
  const mood = MOOD.find((m) => m.id === record?.mood);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.05 }}
      className="card p-4"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-bold">
          Day {day}
          {date && <span className="ml-2 text-sm font-medium text-foreground/65">{format(date, t("M월 d일 (E)"), { locale: df })}</span>}
        </h3>
        {!canEdit && (weather || mood) && (
          <span className="flex items-center gap-2 text-sm text-foreground/72">
            {weather && <weather.icon size={16} aria-label={t(weather.label)} />}
            {mood && <span aria-label={t(mood.label)}>{mood.emoji}</span>}
          </span>
        )}
      </header>

      {canEdit && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          <div role="group" aria-label={t("날씨")} className="flex gap-1">
            {WEATHER.map(({ id, label, icon: Icon }) => {
              const on = record?.weather === id;
              return (
                <button
                  key={id}
                  aria-pressed={on}
                  aria-label={t(label)}
                  title={t(label)}
                  onClick={() => onSaveDay({ weather: on ? null : id })}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                    on ? "bg-ink text-white" : "bg-surface-muted text-foreground/68 hover:bg-primary-soft"
                  }`}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
          <div role="group" aria-label={t("기분")} className="flex gap-1">
            {MOOD.map(({ id, label, emoji }) => {
              const on = record?.mood === id;
              return (
                <button
                  key={id}
                  aria-pressed={on}
                  aria-label={t(label)}
                  title={t(label)}
                  onClick={() => onSaveDay({ mood: on ? null : id })}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition ${
                    on ? "bg-primary-soft ring-2 ring-primary" : "bg-surface-muted opacity-60 hover:opacity-100"
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {canEdit ? (
        <textarea
          aria-label={t("Day {day} 일기", { day })}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (note.trim() !== remote) onSaveDay({ note: note.trim() || null });
          }}
          rows={3}
          placeholder={t("오늘 있었던 일, 기억하고 싶은 장면…")}
          className="input mt-3 resize-y"
        />
      ) : (
        record?.note && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{record.note}</p>
      )}

      {points.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-border-subtle pt-3">
          {points.map((p) => (
            <PlaceReview key={p.id} point={p} canEdit={canEdit} onSave={onSavePoint} />
          ))}
        </ul>
      )}
    </motion.section>
  );
}

function PlaceReview({
  point,
  canEdit,
  onSave,
}: {
  point: MapPoint;
  canEdit: boolean;
  onSave: (id: string, patch: PointPatch) => Promise<string | null>;
}) {
  const t = useT();
  const [review, setReview] = useState(point.review ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save(patch: PointPatch) {
    setError(await onSave(point.id, patch));
  }

  return (
    <li className="flex gap-3">
      <PointBadge point={point} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <p className="truncate text-sm font-semibold">{point.name}</p>
          <Stars value={point.rating ?? null} onChange={canEdit ? (rating) => void save({ rating }) : undefined} />
        </div>
        {canEdit ? (
          <input
            value={review}
            onChange={(e) => setReview(e.target.value)}
            onBlur={() => review.trim() !== (point.review ?? "") && void save({ review: review.trim() || null })}
            maxLength={500}
            aria-label={t("{name} 한줄평", { name: point.name })}
            placeholder={t("한줄평")}
            className="mt-1 w-full border-b border-transparent bg-transparent py-1 text-sm text-foreground/80 outline-none placeholder:text-foreground/40 focus:border-primary"
          />
        ) : (
          point.review && <p className="mt-0.5 text-sm text-foreground/72">{point.review}</p>
        )}
        {error && <p className="mt-1 text-xs text-accent">{error}</p>}
      </div>
    </li>
  );
}

/** 별점. onChange 가 없으면 보기 전용. 같은 별을 다시 누르면 지운다 */
export function Stars({ value, onChange, size = 16 }: { value: number | null; onChange?: (v: number | null) => void; size?: number }) {
  const t = useT();
  if (!onChange) {
    if (!value) return null;
    return (
      <span className="flex text-sand" aria-label={t("별점 {n}점", { n: value })}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={size} fill={i < value ? "currentColor" : "none"} aria-hidden />
        ))}
      </span>
    );
  }
  return (
    <span role="group" aria-label={t("별점")} className="flex">
      {Array.from({ length: 5 }, (_, i) => {
        const v = i + 1;
        return (
          <button
            key={v}
            aria-label={t("{n}점", { n: v })}
            aria-pressed={value === v}
            onClick={() => onChange(value === v ? null : v)}
            className="p-0.5 text-sand transition active:scale-90"
          >
            <Star size={size} fill={value != null && v <= value ? "currentColor" : "none"} strokeWidth={value != null && v <= value ? 2 : 1.6} />
          </button>
        );
      })}
    </span>
  );
}
