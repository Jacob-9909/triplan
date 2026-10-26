import { CATEGORIES, categoryStyle, type PointCategory } from "./pointStyle";

export type { PointCategory };

/** 카테고리별 기본 핀 색상 (pointStyle.CATEGORIES에서 파생) */
export const CATEGORY_COLORS = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.color])) as Record<PointCategory, string>;

export const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<PointCategory, string>;

export function getCategoryColor(category: PointCategory): string {
  return categoryStyle(category).color;
}

export function getCategoryLabel(category: PointCategory): string {
  return categoryStyle(category).label;
}

export const ALL_CATEGORIES = CATEGORIES.map((c) => c.id);
