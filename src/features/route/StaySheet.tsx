"use client";

import { useState } from "react";
import { BedDouble, Check } from "lucide-react";
import type { MapPoint } from "@/lib/types";
import Sheet from "@/features/ui/Sheet";
import PlaceSearch, { type PickedPlace } from "@/features/map/PlaceSearch";
import { usePrefs } from "@/i18n/I18nProvider";

/**
 * Day N 밤 숙소 고르기: 분류가 '숙소'인 장소 중에서 고르거나, 검색해서 새로 넣는다.
 * 남은 밤에도 같은 숙소를 쓰는 경우가 많아 "남은 밤에도"를 기본으로 켠다 (뒤 밤에 다른 숙소가 있으면 끈다).
 */
export default function StaySheet({
  night,
  lastNight,
  stayByNight,
  candidates,
  center,
  onClose,
  onSet,
  onCreate,
}: {
  /** 고르는 밤 (Day 번호). null 이면 닫힘 */
  night: number | null;
  /** 마지막 밤 (여행 일수 - 1) */
  lastNight: number;
  stayByNight: Record<number, string>;
  /** 분류가 숙소인 장소 */
  candidates: MapPoint[];
  center: { lat: number; lng: number } | null;
  onClose: () => void;
  /** 숙소 지정(null 이면 비우기). nights 는 바꿀 밤들. 실패하면 오류 메시지 */
  onSet: (pointId: string | null, nights: number[]) => Promise<string | null>;
  /** 검색한 곳을 숙소 장소로 만든다 */
  onCreate: (place: PickedPlace) => Promise<MapPoint | null>;
}) {
  return (
    <Sheet open={night !== null} onClose={onClose} title={night !== null ? <Title night={night} /> : null}>
      {night !== null && (
        <Body
          key={night}
          night={night}
          lastNight={lastNight}
          stayByNight={stayByNight}
          candidates={candidates}
          center={center}
          onClose={onClose}
          onSet={onSet}
          onCreate={onCreate}
        />
      )}
    </Sheet>
  );
}

function Title({ night }: { night: number }) {
  const { t } = usePrefs();
  return (
    <span className="flex items-center gap-2">
      <BedDouble size={20} aria-hidden /> {t("Day {n} 밤 숙소", { n: night })}
    </span>
  );
}

function Body({
  night,
  lastNight,
  stayByNight,
  candidates,
  center,
  onClose,
  onSet,
  onCreate,
}: {
  night: number;
  lastNight: number;
  stayByNight: Record<number, string>;
  candidates: MapPoint[];
  center: { lat: number; lng: number } | null;
  onClose: () => void;
  onSet: (pointId: string | null, nights: number[]) => Promise<string | null>;
  onCreate: (place: PickedPlace) => Promise<MapPoint | null>;
}) {
  const { t } = usePrefs();
  const current = stayByNight[night] ?? null;
  const later = Array.from({ length: Math.max(0, lastNight - night) }, (_, i) => night + 1 + i);
  const [rest, setRest] = useState(later.length > 0 && later.every((n) => !stayByNight[n] || stayByNight[n] === current));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(id: string | null) {
    setBusy(true);
    const err = await onSet(id, rest ? [night, ...later] : [night]);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  }

  /** 이 숙소를 쓰는 밤들 (Day 번호) */
  const usedOn = (id: string) =>
    Object.entries(stayByNight)
      .filter(([, v]) => v === id)
      .map(([k]) => Number(k))
      .sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <PlaceSearch
        center={center}
        onPick={async (place) => {
          setBusy(true);
          const created = await onCreate(place);
          setBusy(false);
          if (created) await pick(created.id);
          else setError(t("숙소를 추가하지 못했어요."));
        }}
      />

      {candidates.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted px-4 py-5 text-center text-sm text-foreground/68">
          {t("숙소를 검색해 추가하거나, 장소 분류를 '숙소'로 바꾸면 여기 나와요.")}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {candidates.map((p) => {
            const on = p.id === current;
            const used = usedOn(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={on}
                  onClick={() => void pick(p.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition disabled:opacity-60 ${
                    on ? "border-primary bg-primary-soft" : "border-border-subtle hover:border-primary/50"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-on-ink">
                    <BedDouble size={17} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    {used.length > 0 && (
                      <span className="block text-[11px] text-foreground/68">
                        {t("{days} 밤", { days: used.map((d) => `Day ${d}`).join(", ") })}
                      </span>
                    )}
                  </span>
                  {on && <Check size={18} className="shrink-0 text-primary-strong" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {later.length > 0 && (
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={rest} onChange={(e) => setRest(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
          {t("남은 밤(Day {from}~{to})에도 같은 숙소", { from: night + 1, to: lastNight })}
        </label>
      )}

      {current && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void pick(null)}
          className="w-full rounded-full py-2.5 text-sm font-semibold text-accent hover:bg-accent-soft disabled:opacity-60"
        >
          {t("이 밤 숙소 비우기")}
        </button>
      )}
      {error && <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-accent">{error}</p>}
      <p className="text-xs leading-relaxed text-foreground/68">
        {t("숙소를 정하면 다음 날은 숙소에서 출발하고, 그날 마지막 장소 뒤에 숙소로 돌아오는 길이 붙어요.")}
      </p>
    </div>
  );
}
