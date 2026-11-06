"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Banknote, FileText, History, MapPin, PencilLine } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useSyncStatus, useTripChanges, usePresence, type Viewer } from "@/lib/realtime";
import Sheet from "@/features/ui/Sheet";
import { usePrefs } from "@/i18n/I18nProvider";
import type { T } from "@/i18n/translate";

interface Activity {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

const SPECIAL_ACTORS: Record<string, string> = {
  "@admin": "관리자",
  "@edit-link": "편집 링크 손님",
  "@view-link": "보기 링크 손님",
  "@demo": "체험 회원",
  "@guest": "손님",
};

/** 회원 아이디는 그대로, '@admin' 같은 특별한 이름은 번역 */
export function actorLabel(name: string, t: T) {
  return SPECIAL_ACTORS[name] ? t(SPECIAL_ACTORS[name]) : name;
}

/** 이름 첫 글자 동그라미. 같은 이름은 늘 같은 색 */
const AVATAR_COLORS = ["#cc4126", "#0d6b63", "#6d5bd0", "#b7791f", "#2f5d8a", "#be185d"];
export function Avatar({ name, size = 28, ring = "ring-surface" }: { name: string; size?: number; ring?: string }) {
  const t = usePrefs().t;
  const label = actorLabel(name, t);
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <span
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ${ring}`}
      style={{ width: size, height: size, fontSize: size * 0.42, background: AVATAR_COLORS[hash % AVATAR_COLORS.length] }}
    >
      {[...label][0]?.toUpperCase()}
    </span>
  );
}

/** 같은 사람이 탭을 여러 개 열어도 한 번만 */
export function uniqueViewers(list: Viewer[]) {
  return [...new Map(list.map((v) => [v.name, v])).values()];
}

const DAY_FIELD = (d: unknown, t: T) => (d == null ? t("후보함") : `Day ${d}`);
const FIELD_LABELS: Record<string, string> = {
  title: "제목",
  start_date: "날짜",
  end_date: "날짜",
  country: "여행지",
  region: "여행지",
  continent: "여행지",
  budget_krw: "예산",
  base_currency: "현지 통화",
  cover_image_url: "커버 사진",
  is_demo: "체험 공개",
};

function describe(a: Activity, t: T, money: (krw: number) => string) {
  const d = a.detail ?? {};
  switch (a.action) {
    case "point.add":
      return { icon: MapPin, text: t("장소 추가"), extra: DAY_FIELD(d.day, t) };
    case "point.move":
      return { icon: MapPin, text: t("장소 옮김"), extra: `${DAY_FIELD(d.from, t)} → ${DAY_FIELD(d.to, t)}` };
    case "point.delete":
      return { icon: MapPin, text: t("장소 삭제"), extra: null };
    case "expense.add":
      return { icon: Banknote, text: t("지출 추가"), extra: typeof d.amount_krw === "number" ? money(d.amount_krw) : null };
    case "expense.delete":
      return { icon: Banknote, text: t("지출 삭제"), extra: typeof d.amount_krw === "number" ? money(d.amount_krw) : null };
    case "doc.add":
      return { icon: FileText, text: t("예약 추가"), extra: null };
    case "doc.delete":
      return { icon: FileText, text: t("예약 삭제"), extra: null };
    default: {
      const fields = Array.isArray(d.fields) ? [...new Set((d.fields as string[]).map((f) => FIELD_LABELS[f]).filter(Boolean))] : [];
      return { icon: PencilLine, text: t("여행 정보 수정"), extra: fields.map((f) => t(f)).join(", ") || null };
    }
  }
}

/** 지금 같이 보는 사람 + 최근 변경 기록 */
export default function ActivitySheet({ tripId, open, onClose }: { tripId: string; open: boolean; onClose: () => void }) {
  const { t, df, money } = usePrefs();
  const viewers = uniqueViewers(usePresence(tripId));
  const status = useSyncStatus(tripId);
  const [items, setItems] = useState<Activity[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    apiGet<Activity[]>(`/api/trips/${tripId}/activity`)
      .then((rows) => {
        setItems(rows);
        setError(false);
      })
      .catch(() => setError(true));
  }, [tripId]);
  useEffect(() => {
    if (open) load();
  }, [open, load]);
  useTripChanges(tripId, ["trip_activity"], () => open && load());

  return (
    <Sheet open={open} onClose={onClose} title={t("함께 보기")}>
      <section>
        <h3 className="mb-2 text-xs font-bold text-foreground/65">{t("지금 보고 있는 사람")}</h3>
        {status !== "live" ? (
          <p className="text-sm text-foreground/68">{t("실시간 연결이 아니라 지금 누가 보는지는 알 수 없어요.")}</p>
        ) : viewers.length === 0 ? (
          <p className="text-sm text-foreground/68">{t("지금은 나만 보고 있어요.")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {viewers.map((v) => (
              <li key={v.id} className="inline-flex items-center gap-2 rounded-full bg-surface-muted py-1 pl-1 pr-3 text-sm font-semibold">
                <Avatar name={v.name} size={24} ring="ring-transparent" />
                {actorLabel(v.name, t)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground/65">
          <History size={13} aria-hidden /> {t("최근 변경")}
        </h3>
        {error ? (
          <p className="text-sm text-accent">{t("변경 기록을 불러오지 못했어요.")}</p>
        ) : items === null ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-12 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-foreground/68">{t("아직 변경 기록이 없어요. 장소·지출·예약을 바꾸면 여기에 남아요.")}</p>
        ) : (
          <ol className="divide-y divide-border-subtle">
            {items.map((a) => {
              const { icon: Icon, text, extra } = describe(a, t, money);
              return (
                <li key={a.id} className="flex items-start gap-3 py-2.5">
                  <Avatar name={a.actor} ring="ring-transparent" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                      <span className="font-bold">{actorLabel(a.actor, t)}</span>
                      <span className="text-[11px] text-foreground/60">
                        {formatDistanceToNowStrict(new Date(a.created_at), { addSuffix: true, locale: df })}
                      </span>
                    </p>
                    <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-foreground/80">
                      <Icon size={13} className="shrink-0 text-foreground/50" aria-hidden />
                      <span className="shrink-0">{text}</span>
                      {a.target && <span className="truncate font-semibold">· {a.target}</span>}
                      {extra && <span className="shrink-0 text-xs text-foreground/60">{extra}</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </Sheet>
  );
}
