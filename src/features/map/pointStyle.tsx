import {
  BedDouble,
  Binoculars,
  Coffee,
  Landmark,
  MapPin,
  ShoppingBag,
  TrainFront,
  Trees,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { MapPoint } from "@/lib/types";

export type PointCategory = MapPoint["category"];

export interface CategoryStyle {
  id: PointCategory;
  label: string;
  icon: LucideIcon;
  /** 기본 핀 색상 */
  color: string;
}

/** 장소 분류: 아이콘과 기본 색. 지도 핀·일정 목록·타임라인이 모두 이 표를 쓴다 */
export const CATEGORIES: CategoryStyle[] = [
  { id: "attraction", label: "관광지", icon: Binoculars, color: "#0b84e0" },
  { id: "food", label: "음식점", icon: Utensils, color: "#ff6b5e" },
  { id: "cafe", label: "카페", icon: Coffee, color: "#b45309" },
  { id: "shopping", label: "쇼핑", icon: ShoppingBag, color: "#f59e0b" },
  { id: "culture", label: "문화재", icon: Landmark, color: "#8b5cf6" },
  { id: "nature", label: "자연", icon: Trees, color: "#16a34a" },
  { id: "stay", label: "숙소", icon: BedDouble, color: "#ec4899" },
  { id: "transport", label: "교통", icon: TrainFront, color: "#0891b2" },
  { id: "etc", label: "기타", icon: MapPin, color: "#64748b" },
];

/** 핀 색상 선택지 */
export const PALETTE = ["#0b84e0", "#ff6b5e", "#f59e0b", "#16a34a", "#8b5cf6", "#ec4899", "#0891b2", "#b45309", "#334155"];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryStyle(category: PointCategory | string | null | undefined): CategoryStyle {
  return BY_ID.get(category as PointCategory) ?? BY_ID.get("etc")!;
}

/** 장소에 지정한 색, 없으면 분류 기본색 */
export function pointColor(point: Pick<MapPoint, "category" | "color">): string {
  return point.color || categoryStyle(point.category).color;
}

/** 색 위에 얹을 연한 배경 (hex + alpha) */
export function tint(color: string, alpha = 0.14) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${color}${a}`;
}

/** 분류 아이콘을 지정 색으로 그린 둥근 배지 */
export function PointBadge({
  point,
  size = 36,
  className = "",
}: {
  point: Pick<MapPoint, "category" | "color">;
  size?: number;
  className?: string;
}) {
  const { icon: Icon } = categoryStyle(point.category);
  const color = pointColor(point);
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-xl ${className}`}
      style={{ width: size, height: size, backgroundColor: tint(color), color }}
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={2.2} />
    </span>
  );
}
