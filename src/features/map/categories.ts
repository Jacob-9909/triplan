import type { MapPoint } from "@/lib/types";

export type PointCategory = MapPoint["category"];

/** 카테고리별 핀 색상 (globals.css 토큰 기반 hex) */
export const CATEGORY_COLORS: Record<PointCategory, string> = {
  attraction: "#0ea5e9", // primary
  food: "#fb7185", // accent
  stay: "#a78bfa", // violet
  shopping: "#fcd34d", // sand
  nature: "#34d399", // mint
  transport: "#38bdf8",
  culture: "#fb923c",
  etc: "#94a3b8",
};

export const CATEGORY_LABELS: Record<PointCategory, string> = {
  attraction: "관광",
  food: "음식",
  stay: "숙소",
  transport: "교통",
  shopping: "쇼핑",
  nature: "자연",
  culture: "문화",
  etc: "기타",
};

export function getCategoryColor(category: PointCategory): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.etc;
}

export function getCategoryLabel(category: PointCategory): string {
  return CATEGORY_LABELS[category] ?? CATEGORY_LABELS.etc;
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as PointCategory[];
