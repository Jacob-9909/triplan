import type { MapPoint, RouteLeg } from "@/lib/types";
import type { PlanDay } from "./itinerary";

/** 이보다 짧은 도보는 이동으로 치지 않는다(분) */
const LONG_WALK = 15;

export type Move =
  | { kind: "ride"; at: number; end: number; point: MapPoint }
  | { kind: "leg"; at: number; end: number; leg: RouteLeg; from: MapPoint; to: MapPoint };

const worthShowing = (leg: RouteLeg | null | undefined): leg is RouteLeg =>
  !!leg && (leg.method !== "walk" || (leg.duration_min ?? 0) >= LONG_WALK);

function legMove(leg: RouteLeg, from: MapPoint, to: MapPoint, at: number): Move {
  return { kind: "leg", at, end: at + (leg.duration_min ?? 0), leg, from, to };
}

/** 하루 일정에서 이동만 시간순으로: 교통 장소(열차·공항), 택시·대중교통 구간, 긴 도보 */
export function dayMoves(day: Pick<PlanDay, "stops" | "legs" | "start" | "end">): Move[] {
  const moves: Move[] = [];
  const first = day.stops[0];
  const last = day.stops[day.stops.length - 1];
  if (day.start && first && worthShowing(day.start.leg)) moves.push(legMove(day.start.leg, day.start.point, first.point, day.start.leave));
  day.stops.forEach((s, i) => {
    if (s.point.category === "transport") moves.push({ kind: "ride", at: s.arrive, end: s.leave, point: s.point });
    const next = day.stops[i + 1];
    if (!next) return;
    // 교통 장소 바로 뒤 구간은 그 열차의 나머지라 따로 보이지 않는다
    const leg = day.legs.find((l) => l.from_point_id === s.point.id && l.to_point_id === next.point.id);
    if (s.point.category !== "transport" && worthShowing(leg)) moves.push(legMove(leg, s.point, next.point, s.leave));
  });
  if (day.end && last && worthShowing(day.end.leg)) moves.push(legMove(day.end.leg, last.point, day.end.point, last.leave));
  return moves.sort((a, b) => a.at - b.at);
}

// ponytail: 아래 둘은 메모 글을 문장·화살표·번호로 나누는 단순 규칙이다. 구간·단계를 DB 칸으로 두게 되면 그걸 쓴다

const TIME = /\b(\d{1,2}:\d{2})\b/;
const sentences = (text: string) =>
  text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
const noDot = (s: string) => s.replace(/\.$/, "").trim();

export interface Journey {
  /** 시각과 역·노선. 화살표(→)로 이어 쓴 첫 문장에서 */
  steps: { time: string | null; text: string }[];
  /** "IC …엔" / "이코카 …엔" 으로 시작하는 문장 */
  fare: string | null;
  /** 도중에 내리는 횟수("하차") */
  transfers: number;
  /** 나머지 문장(대안·주의) */
  rest: string | null;
}

/** 교통 장소 메모를 단계·요금·나머지로. 화살표 문장이 없으면 단계 없이 전부 나머지 */
export function parseJourney(memo: string | null): Journey {
  const all = sentences(memo ?? "");
  const at = all.findIndex((s) => s.split("→").length > 1);
  const used = new Set<number>();
  const steps: Journey["steps"] = [];
  if (at >= 0) {
    // 바로 앞 문장이 시각으로 시작하면(예: "06:05 호텔 출발") 첫 단계로
    if (at > 0 && /^\d{1,2}:\d{2}/.test(all[at - 1])) {
      used.add(at - 1);
      steps.push(step(all[at - 1]));
    }
    used.add(at);
    steps.push(...noDot(all[at]).split("→").map(step));
  }
  const fareAt = all.findIndex((s, i) => !used.has(i) && /^(IC|이코카).*\d엔/.test(s)); // i18n-ignore
  if (fareAt >= 0) used.add(fareAt);
  const rest = all.filter((_, i) => !used.has(i)).join(" ");
  return {
    steps,
    fare: fareAt >= 0 ? noDot(all[fareAt]) : null,
    // 마지막 단계의 "하차"는 도착이라 환승이 아니다
    transfers: steps.slice(0, -1).filter((s) => s.text.includes("하차")).length, // i18n-ignore
    rest: rest || null,
  };
}

function step(raw: string): Journey["steps"][number] {
  const text = noDot(raw);
  const m = TIME.exec(text);
  return { time: m ? m[1] : null, text: (m ? text.replace(m[0], "") : text).replace(/\s+/g, " ").trim() };
}

export type PayKind = "ic" | "ticket" | "cash";
/** 이동 하나를 무엇으로 내는지. amount 는 메모에 적힌 그대로("약 720엔"), label 은 티켓 이름 */
export interface Pay {
  kind: PayKind;
  amount: string | null;
  label: string | null;
}

const AMOUNT = /(약\s*)?[\d,]+(\s*~\s*[\d,]+)?엔/; // i18n-ignore

/** "+" 로 이은 요금 문장을 나눈다. 괄호 안 "+"(내역)는 나누지 않는다 */
function splitFare(fare: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of fare) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "+" && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  return [...out, cur.trim()].filter(Boolean);
}

/** 열차는 메모의 요금 문장, 택시는 카드·현금, 대중교통 구간은 이코카. 금액은 "다음 이동" 선택지에서 그 수단 줄 */
export function movePays(m: Move): Pay[] {
  if (m.kind === "ride") {
    const fare = parseJourney(m.point.memo).fare;
    if (!fare) return [];
    return splitFare(fare).map((part) =>
      /티켓|패스/.test(part) // i18n-ignore
        ? { kind: "ticket", amount: null, label: part }
        : { kind: "ic", amount: AMOUNT.exec(part)?.[0] ?? null, label: null }
    );
  }
  const options = nextMoveOptions(m.from.memo)?.options ?? [];
  const pick = (test: (o: string) => boolean) => AMOUNT.exec(options.find(test) ?? "")?.[0] ?? null;
  // 선택지 첫 단어가 수단이다 (대중교통 줄 안에도 "도보 15분" 같은 말이 섞인다)
  if (m.leg.method === "taxi") return [{ kind: "cash", amount: pick((o) => /^택시/.test(o)), label: null }]; // i18n-ignore
  if (m.leg.method === "transit") return [{ kind: "ic", amount: pick((o) => !/^(택시|도보)/.test(o) && AMOUNT.test(o)), label: null }]; // i18n-ignore
  return [];
}

/** "약 1,400~1,800엔" → [1400, 1800], "720엔" → [720, 720] */
export function yenRange(amount: string | null): [number, number] | null {
  const nums = amount?.match(/[\d,]+(?=\s*(~|엔))/g)?.map((n) => Number(n.replaceAll(",", ""))); // i18n-ignore
  return nums?.length ? [nums[0], nums[nums.length - 1]] : null;
}

/** 여러 이동의 결제를 수단별로 더한다. 금액을 모르는 이동은 횟수만 */
export function payTotals(pays: Pay[]) {
  const sum = (kind: PayKind) => {
    const list = pays.filter((p) => p.kind === kind);
    const ranges = list.map((p) => yenRange(p.amount)).filter((r): r is [number, number] => !!r);
    return {
      count: list.length,
      lo: ranges.reduce((s, r) => s + r[0], 0),
      hi: ranges.reduce((s, r) => s + r[1], 0),
    };
  };
  return { ic: sum("ic"), cash: sum("cash"), tickets: pays.filter((p) => p.kind === "ticket").map((p) => p.label ?? "") };
}

/** 장소 메모의 "다음 이동 → 목적지: ① … ② …" 를 목적지와 선택지로 */
export function nextMoveOptions(memo: string | null): { options: string[]; rest: string | null } | null {
  const i = memo?.indexOf("다음 이동") ?? -1; // i18n-ignore
  if (!memo || i < 0) return null;
  const body = memo.slice(i).replace(/^다음 이동\s*→?\s*[^:：]*[:：]\s*/, ""); // i18n-ignore
  const parts = body.split(/[①②③④⑤⑥⑦⑧⑨]/).map((s) => noDot(s.trim()));
  const [lead, ...options] = parts;
  return options.length ? { options: options.filter(Boolean), rest: lead || null } : { options: [], rest: noDot(body) || null };
}
