"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import type { MapPoint } from "@/lib/types";
import { ApiError, apiPost } from "@/lib/api";
import Sheet from "@/features/ui/Sheet";
import { categoryStyle } from "@/features/map/pointStyle";
import { usePrefs } from "@/i18n/I18nProvider";

const INTERESTS = ["맛집", "카페", "명소", "쇼핑", "자연·공원", "문화·역사", "야경", "아이와 함께", "비 오는 날"];

export interface Suggested {
  name: string;
  category: MapPoint["category"];
  reason: string;
  lat: number;
  lng: number;
  address: string;
}

/**
 * AI 후보 추천: 관심사·메모로 장소를 추천받고, 지도에서 위치를 확인한 곳 중 고른 것만 후보함에 담는다.
 * 담은 뒤에는 후보함의 "구역으로 묶기"로 Day 에 나눠 넣으면 된다.
 */
export default function SuggestSheet({
  open,
  tripId,
  onClose,
  onAdd,
}: {
  open: boolean;
  tripId: string;
  onClose: () => void;
  /** 고른 장소를 후보함에 넣는다. 넣은 수를 돌려준다 */
  onAdd: (places: Suggested[]) => Promise<number>;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={<Title />}>
      {open && <Body tripId={tripId} onClose={onClose} onAdd={onAdd} />}
    </Sheet>
  );
}

function Title() {
  const { t } = usePrefs();
  return (
    <span className="flex items-center gap-2">
      <Sparkles size={20} className="text-primary-strong" aria-hidden /> {t("AI 후보 추천")}
    </span>
  );
}

function Body({ tripId, onClose, onAdd }: { tripId: string; onClose: () => void; onAdd: (places: Suggested[]) => Promise<number> }) {
  const { t, locale } = usePrefs();
  const [interests, setInterests] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"ask" | "add" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ places: Suggested[]; dropped: number } | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  async function ask() {
    setBusy("ask");
    setError(null);
    try {
      const r = await apiPost<{ places: Suggested[]; dropped: number }>("/api/ai/suggest", {
        trip_id: tripId,
        // 관심사는 한국어 문장 키 그대로 보내고, 화면 언어로 답해 달라고 한다
        interests: interests.map((i) => t(i)),
        note,
        locale,
      });
      setResult(r);
      setPicked(new Set(r.places.map((_, i) => i)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("AI 추천을 받지 못했어요. 잠시 뒤 다시 해 보세요."));
    } finally {
      setBusy(null);
    }
  }

  async function add() {
    if (!result) return;
    setBusy("add");
    await onAdd(result.places.filter((_, i) => picked.has(i)));
    setBusy(null);
    onClose();
  }

  if (result) {
    return (
      <div className="space-y-3">
        {result.places.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted px-4 py-6 text-center text-sm text-foreground/68">
            {t("지도에서 위치를 확인한 곳이 없어요. 관심사를 바꿔 다시 해 보세요.")}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {result.places.map((p, i) => {
              const on = picked.has(i);
              const style = categoryStyle(p.category);
              return (
                <li key={`${p.name}-${i}`}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                      on ? "border-primary bg-primary-soft/60" : "border-border-subtle opacity-70"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${on ? "border-primary bg-primary text-white" : "border-border-subtle"}`}
                    >
                      {on && <Check size={13} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 text-sm font-bold">
                        {p.name}
                        <span className="text-[11px] font-semibold" style={{ color: style.color }}>
                          {t(style.label)}
                        </span>
                      </span>
                      {p.reason && <span className="mt-0.5 block text-xs leading-relaxed text-foreground/72">{p.reason}</span>}
                      {p.address && <span className="mt-0.5 block truncate text-[11px] text-foreground/60">{p.address}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {result.dropped > 0 && (
          <p className="text-xs text-foreground/68">{t("위치를 확인하지 못했거나 이미 있는 {n}곳은 뺐어요.", { n: result.dropped })}</p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => setResult(null)} className="btn btn-ghost flex-1 py-3 text-sm">
            {t("다시 고르기")}
          </button>
          <button
            type="button"
            disabled={picked.size === 0 || busy !== null}
            onClick={() => void add()}
            className="btn btn-primary flex-[2] py-3 text-sm disabled:opacity-50"
          >
            {busy === "add" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
            {t("후보함에 담기 ({n}곳)", { n: picked.size })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-sm font-bold">{t("어떤 곳이 좋아요?")}</h3>
        <div className="flex flex-wrap gap-1.5">
          {INTERESTS.map((i) => {
            const on = interests.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                onClick={() => setInterests((prev) => (on ? prev.filter((x) => x !== i) : [...prev, i]))}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  on ? "bg-ink text-white" : "bg-surface-muted text-foreground/72 hover:bg-primary-soft"
                }`}
              >
                {t(i)}
              </button>
            );
          })}
        </div>
      </section>
      <label className="block">
        <span className="mb-2 block text-sm font-bold">{t("더 알려 주세요 (선택)")}</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 200))}
          rows={2}
          placeholder={t("예: 현지인이 가는 라멘집, 걷기 좋은 골목, 부모님과 함께")}
          className="input resize-none"
        />
      </label>
      {error && <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-accent">{error}</p>}
      <button type="button" disabled={busy !== null} onClick={() => void ask()} className="btn btn-primary w-full py-3 text-sm disabled:opacity-60">
        {busy === "ask" ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden /> {t("고르고 위치를 확인하는 중… (1분 가까이 걸릴 수 있어요)")}
          </>
        ) : (
          <>
            <Sparkles size={16} aria-hidden /> {t("추천 받기")}
          </>
        )}
      </button>
      <p className="text-xs leading-relaxed text-foreground/68">
        {t("AI 추천은 틀릴 수 있어요. 지도 검색으로 위치를 확인한 곳만 보여 주고, 고른 곳만 후보함에 담아요.")}
      </p>
    </div>
  );
}
