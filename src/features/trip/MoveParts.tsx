"use client";

import type { ReactNode } from "react";
import { ChevronDown, CreditCard, Plane, Ticket, TrainFront, Wallet, type LucideIcon } from "lucide-react";
import type { RouteLeg } from "@/lib/types";
import { usePrefs } from "@/i18n/I18nProvider";
import { METHOD_META } from "@/features/route/meta";
import { payTotals, type Journey, type Move, type Pay, type PayKind } from "./transport";

/** 교통 탭·일정 탭·여행 당일 카드가 같이 쓰는 이동 부품 (같은 정보는 어디서나 같은 모양) */

export interface Tone {
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

/** 열차·공항 같은 교통 장소의 아이콘·색. 이름으로 공항 여부를 본다 */
export function rideTone(name: string): Tone {
  // ponytail: 이름으로 공항 여부를 본다. 교통 장소에 세부 종류가 생기면 그걸 쓴다
  const air = /공항|空港|KIX|airport/i.test(name); // i18n-ignore
  return { icon: air ? Plane : TrainFront, label: air ? "공항" : "열차", bar: "bg-violet", ring: "border-violet" };
}

export function toneOf(m: Move): Tone {
  if (m.kind === "ride") return rideTone(m.point.name);
  return { icon: METHOD_META[m.leg.method].icon, label: METHOD_META[m.leg.method].label, ...LEG_TONE[m.leg.method] };
}

export const CHIP = "inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-foreground/80";

/** 내는 법: 교통카드, 미리 산 티켓, 택시(카드·현금) */
export const PAY_META: Record<PayKind, { icon: LucideIcon; label: string; bg: string }> = {
  ic: { icon: CreditCard, label: "이코카", bg: "bg-mint" },
  ticket: { icon: Ticket, label: "e티켓", bg: "bg-violet" },
  cash: { icon: Wallet, label: "카드·현금", bg: "bg-sand" },
};

/** 결제 태그: 일반 칩(회색)과 달리 테두리와 수단 색 아이콘으로 눈에 띄게 */
export function PayTag({ kind, children, size = "sm" }: { kind: PayKind; children: ReactNode; size?: "sm" | "md" }) {
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

/** 이동 하나의 결제 태그들: 이름(티켓·GO 가 있으면 그 이름)과 금액 */
export function PayTags({ pays }: { pays: Pay[] }) {
  const { t } = usePrefs();
  return (
    <>
      {pays.map((p, i) => (
        <PayTag key={i} kind={p.kind}>
          {p.label ?? t(PAY_META[p.kind].label)}
          {p.amount && <span className="font-extrabold">{p.amount}</span>}
        </PayTag>
      ))}
    </>
  );
}

/** 수단별 합계 태그들. 금액을 모르면 이름만 */
export function PayTotals({ pays, size }: { pays: Pay[]; size?: "sm" | "md" }) {
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
          {tot.cashLabel ?? t(PAY_META.cash.label)} {tot.cash.hi > 0 && <span className="font-extrabold">{yen(tot.cash.lo, tot.cash.hi)}</span>}
        </PayTag>
      )}
    </>
  );
}

/** 환승 단계를 노선도처럼: 처음·끝 역은 꽉 찬 점, 중간은 빈 점. current 는 지금 다음 단계 */
export function JourneySteps({ steps, tone, current }: { steps: Journey["steps"]; tone: Pick<Tone, "bar" | "ring">; current?: number }) {
  const { t } = usePrefs();
  return (
    <ol className="relative space-y-2 pl-6" aria-label={t("경로")}>
      <span aria-hidden className={`absolute bottom-2 left-[7px] top-2 w-0.5 rounded-full ${tone.bar}`} />
      {steps.map((s, i) => {
        const end = i === 0 || i === steps.length - 1;
        const now = i === current;
        return (
          <li key={i} className={`relative flex gap-2 text-[13px] leading-snug ${now ? "font-bold" : ""}`} aria-current={now ? "step" : undefined}>
            <span
              aria-hidden
              className={`absolute -left-6 top-0.5 h-4 w-4 rounded-full border-[3px] ${end || now ? `${tone.bar} border-surface` : `bg-surface ${tone.ring}`}`}
            />
            <span className="w-10 shrink-0 font-bold tabular-nums">{s.time}</span>
            <span className="min-w-0 text-foreground/85 [overflow-wrap:anywhere]">{s.text}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** "다음 이동 → ① ② ③" 메모에서 뽑은 다른 방법들 */
export function ChoiceList({ options, label }: { options: string[]; label: string }) {
  return (
    <ol className="space-y-1.5" aria-label={label}>
      {options.map((o, i) => (
        <li key={i} className="flex gap-2 rounded-xl bg-surface-muted px-2.5 py-1.5 text-[13px] leading-snug">
          <span className="font-extrabold tabular-nums text-foreground/55">{i + 1}</span>
          <span className="min-w-0 [overflow-wrap:anywhere]">{o}</span>
        </li>
      ))}
    </ol>
  );
}

/** 단계로 못 나눈 나머지 메모(대안·주의)는 접어 둔다 */
export function MoreNote({ text }: { text: string }) {
  const { t } = usePrefs();
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full text-xs font-semibold text-foreground/65 hover:text-foreground [&::-webkit-details-marker]:hidden">
        {t("팁·대안")}
        <ChevronDown size={13} className="transition group-open:rotate-180" aria-hidden />
      </summary>
      <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/75">{text}</p>
    </details>
  );
}
