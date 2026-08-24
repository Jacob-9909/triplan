import {
  Bike,
  Bus,
  Camera,
  CarFront,
  CircleHelp,
  Footprints,
  Landmark,
  MapPin,
  Plane,
  Ship,
  ShoppingBag,
  TrainFront,
  Trees,
  Utensils,
  Hotel,
  type LucideIcon,
} from "lucide-react";
import type { MapPoint, RouteLeg } from "@/lib/types";

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

export const CATEGORY_META: Record<PointCategory, CategoryMeta> = {
  attraction: { icon: Camera, label: "관광", color: "text-primary-strong", bg: "bg-primary-soft" },
  food: { icon: Utensils, label: "식당", color: "text-accent", bg: "bg-accent-soft" },
  stay: { icon: Hotel, label: "숙소", color: "text-violet", bg: "bg-violet/15" },
  transport: { icon: TrainFront, label: "교통", color: "text-mint", bg: "bg-mint/15" },
  shopping: { icon: ShoppingBag, label: "쇼핑", color: "text-sand", bg: "bg-sand/20" },
  nature: { icon: Trees, label: "자연", color: "text-mint", bg: "bg-mint/10" },
  culture: { icon: Landmark, label: "문화", color: "text-violet", bg: "bg-violet/15" },
  etc: { icon: CircleHelp, label: "기타", color: "text-foreground/60", bg: "bg-surface-muted" },
};

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
