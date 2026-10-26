import { Bike, Bus, CarFront, Footprints, MapPin, Plane, Ship, type LucideIcon } from "lucide-react";
import type { MapPoint, RouteLeg } from "@/lib/types";
import { CATEGORIES } from "@/features/map/pointStyle";

export type PointCategory = MapPoint["category"];
export type LegMethod = RouteLeg["method"];

interface CategoryMeta {
  icon: LucideIcon;
  label: string;
  /** 아이콘 색상 (Tailwind text-*) */
  color: string;
  /** 배경 (Tailwind bg-* / CSS 변수 기반) */
  bg: string;
}

/** 분류별 아이콘·이름 (map/pointStyle의 CATEGORIES에서 파생, 색은 pointColor 사용) */
export const CATEGORY_META = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, { icon: c.icon, label: c.label, color: "", bg: "" }])
) as Record<PointCategory, CategoryMeta>;

export interface MethodMeta {
  icon: LucideIcon;
  label: string;
  /** 칩 활성 색상 */
  activeClass: string;
}

export const METHOD_META: Record<LegMethod, MethodMeta> = {
  walk: {
    icon: Footprints,
    label: "도보",
    activeClass: "border-primary bg-primary text-white",
  },
  transit: {
    icon: Bus,
    label: "대중교통",
    activeClass: "border-mint bg-mint text-white",
  },
  taxi: {
    icon: CarFront,
    label: "택시",
    activeClass: "border-sand bg-sand text-white",
  },
  "rental-car": {
    icon: CarFront,
    label: "렌터카",
    activeClass: "border-violet bg-violet text-white",
  },
  bike: {
    icon: Bike,
    label: "자전거",
    activeClass: "border-accent bg-accent text-white",
  },
  plane: {
    icon: Plane,
    label: "비행기",
    activeClass: "border-primary-strong bg-primary-strong text-white",
  },
  ferry: {
    icon: Ship,
    label: "페리",
    activeClass: "border-primary bg-primary-soft text-primary-strong",
  },
};

export const POINT_FALLBACK_META: CategoryMeta = CATEGORY_META.etc;

export function getCategoryMeta(category: PointCategory | null | undefined): CategoryMeta {
  if (!category || !(category in CATEGORY_META)) return POINT_FALLBACK_META;
  return CATEGORY_META[category];
}

export { MapPin };
