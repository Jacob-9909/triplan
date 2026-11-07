/**
 * AI 도움 두 가지의 답 검사: 후보 장소 추천, 예약 확인 메일 읽기.
 * AI 가 지어낸 값이 그대로 저장되지 않게 모양·길이·형식을 여기서 거른다 (장소 위치는 지도 검색으로 다시 확인).
 */
import { nimContent } from "./nim.ts";

export const CATEGORIES = ["attraction", "food", "cafe", "shopping", "nature", "culture", "etc"] as const;
export type SuggestCategory = (typeof CATEGORIES)[number];

export interface Suggestion {
  /** 화면 언어 이름 */
  name: string;
  /** 현지어 이름 (지도 검색용) */
  local: string;
  category: SuggestCategory;
  /** 왜 추천하는지 한 줄 */
  reason: string;
}

export const SUGGEST_SCHEMA = {
  type: "object",
  properties: {
    places: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          local: { type: "string" },
          category: { type: "string", enum: [...CATEGORIES] },
          reason: { type: "string" },
        },
        required: ["name", "local", "category", "reason"],
      },
    },
  },
  required: ["places"],
};

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** 추천 답 → 이름이 있는 것만, 같은 이름은 하나만, 최대 limit 곳 */
export function parseSuggestions(json: unknown, limit = 12): Suggestion[] {
  const places = (nimContent(json) as { places?: unknown } | null)?.places;
  if (!Array.isArray(places)) return [];
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const p of places as Record<string, unknown>[]) {
    const name = clip(p?.name, 60);
    const local = clip(p?.local, 80) || name;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const category = CATEGORIES.includes(p.category as SuggestCategory) ? (p.category as SuggestCategory) : "etc";
    out.push({ name, local, category, reason: clip(p?.reason, 120) });
    if (out.length >= limit) break;
  }
  return out;
}

export const DOC_TYPES = ["flight", "hotel", "ticket", "insurance", "visa", "etc"] as const;

export interface ParsedBooking {
  type: (typeof DOC_TYPES)[number];
  title: string;
  provider: string;
  confirmation_code: string;
  starts_at: string;
  ends_at: string;
}

export const BOOKING_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: [...DOC_TYPES] },
    title: { type: "string" },
    provider: { type: "string" },
    confirmation_code: { type: "string" },
    starts_at: { type: "string" },
    ends_at: { type: "string" },
  },
  required: ["type", "title", "provider", "confirmation_code", "starts_at", "ends_at"],
};

/** 날짜는 실제 있는 YYYY-MM-DD 만 (2026-02-30 같은 값은 버린다) */
function isoDate(v: unknown): string {
  const s = clip(v, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : "";
}

/** 예약 메일 답 → 폼에 채울 값. 제목이 없으면 null. 끝 날짜가 시작보다 이르면 버린다 */
export function parseBooking(json: unknown): ParsedBooking | null {
  const b = nimContent(json) as Record<string, unknown> | null;
  const title = clip(b?.title, 80);
  if (!b || !title) return null;
  const starts_at = isoDate(b.starts_at);
  let ends_at = isoDate(b.ends_at);
  if (ends_at && starts_at && ends_at < starts_at) ends_at = "";
  return {
    type: DOC_TYPES.includes(b.type as ParsedBooking["type"]) ? (b.type as ParsedBooking["type"]) : "etc",
    title,
    provider: clip(b.provider, 60),
    confirmation_code: clip(b.confirmation_code, 40).replace(/\s+/g, ""),
    starts_at,
    ends_at,
  };
}
