"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileJson, Loader2, Search } from "lucide-react";
import type { ImportPlan } from "@/lib/tripImport";
import type { Trip } from "@/lib/types";
import { apiPost } from "@/lib/api";
import Sheet from "@/features/ui/Sheet";
import { useT } from "@/i18n/I18nProvider";

interface DryRun {
  ok: boolean;
  errors: string[];
  warnings: string[];
  plan: ImportPlan | null;
}

/**
 * JSON 으로 일정 가져오기 (형식: docs/import-format.md).
 * tripId 가 있으면 그 여행의 일정을 바꾸고, 없으면 새 여행을 만든다. 검사(dry_run) → 미리보기 → 저장 순서.
 */
export default function ImportDialog({ open, onClose, tripId }: { open: boolean; onClose: () => void; tripId?: string }) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={tripId ? t("JSON으로 일정 바꾸기") : t("JSON으로 여행 만들기")} wide>
      {open && <ImportForm tripId={tripId} />}
    </Sheet>
  );
}

function ImportForm({ tripId }: { tripId?: string }) {
  const t = useT();
  const router = useRouter();
  const [text, setText] = useState("");
  const [check, setCheck] = useState<DryRun | null>(null);
  const [busy, setBusy] = useState<"check" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(dryRun: boolean) {
    if (!text.trim() || busy) return;
    setBusy(dryRun ? "check" : "save");
    setError(null);
    try {
      if (dryRun) {
        setCheck(await apiPost<DryRun>("/api/trips/import", { data: text, trip_id: tripId, dry_run: true }));
      } else {
        const done = await apiPost<{ trip: Trip }>("/api/trips/import", { data: text, trip_id: tripId });
        // 바꾸기는 열려 있는 화면의 장소·구간을 다시 읽어야 해서 새로 연다
        if (tripId) window.location.reload();
        else router.push(`/trips/${done.trip.id}`);
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("일정을 가져오지 못했어요."));
    }
    setBusy(null);
  }

  const plan = check?.ok ? check.plan : null;
  const total = plan?.days.reduce((n, d) => n + d.places.length, 0) ?? 0;

  return (
    <div>
      <p className="mb-2 text-sm text-foreground/72">
        {t("정해진 형식의 JSON을 붙여 넣으면 장소·시간·이동·숙소·준비물을 한 번에 넣어요.")}
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setCheck(null);
        }}
        rows={12}
        spellCheck={false}
        placeholder='{ "version": 1, "trip": { … }, "days": [ … ] }'
        aria-label={t("가져올 JSON")}
        className="input resize-y font-mono text-xs leading-relaxed"
      />

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-accent">
          {error}
        </p>
      )}

      {check && !check.ok && (
        <div role="alert" className="mt-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          <p className="font-bold">{t("고칠 곳 {n}개", { n: check.errors.length })}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {check.errors.slice(0, 20).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {plan && (
        <div className="mt-3 rounded-xl bg-surface-muted px-4 py-3 text-sm">
          <p className="font-bold">
            {plan.trip.title ?? t("지금 여행")}
            {plan.trip.start_date && (
              <span className="ml-2 font-normal text-foreground/68">
                {plan.trip.start_date} ~ {plan.trip.end_date ?? ""}
              </span>
            )}
          </p>
          <ul className="mt-2 space-y-1 text-foreground/80">
            {plan.days.map((d) => (
              <li key={d.day} className="flex flex-wrap gap-x-2">
                <span className="font-semibold">Day {d.day}</span>
                {d.area && <span>{d.area}</span>}
                <span className="text-foreground/60">{t("{n}곳 · 이동 {m}개", { n: d.places.length, m: d.legs.length })}</span>
                {d.stay !== null && <span className="text-foreground/60">· {t("숙소 {name}", { name: d.places[d.stay].name })}</span>}
              </li>
            ))}
          </ul>
          {plan.checklist.length > 0 && (
            <p className="mt-2 text-foreground/68">{t("준비물 {n}개", { n: plan.checklist.length })}</p>
          )}
        </div>
      )}

      {check && check.warnings.length > 0 && (
        <div className="mt-3 rounded-xl border border-border px-4 py-3 text-xs text-foreground/72">
          <p className="mb-1 flex items-center gap-1.5 font-bold">
            <AlertTriangle size={14} aria-hidden /> {t("확인해 보세요 ({n})", { n: check.warnings.length })}
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {check.warnings.slice(0, 20).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {plan && tripId && (
        <p className="mt-3 rounded-xl bg-surface-muted px-4 py-3 text-xs leading-relaxed text-foreground/72">
          {t("지금 일정의 장소·이동·구역·숙소를 모두 지우고 바꿔요. 장소에 달린 사진·댓글도 함께 지워지고, 가계부·예약은 그대로예요.")}
        </p>
      )}

      {plan ? (
        <button type="button" disabled={busy !== null} onClick={() => void run(false)} className="btn btn-primary mt-4 w-full py-3">
          {busy === "save" ? <Loader2 size={17} className="animate-spin" /> : <FileJson size={17} />}
          {tripId ? t("{n}곳으로 일정 바꾸기", { n: total }) : t("{n}곳으로 여행 만들기", { n: total })}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy !== null || !text.trim()}
          onClick={() => void run(true)}
          className="btn btn-primary mt-4 w-full py-3 disabled:opacity-60"
        >
          {busy === "check" ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
          {t("검사하기")}
        </button>
      )}
    </div>
  );
}
