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
  { id: "attraction", label: "관광지", icon: Binoculars, color: "#0d6b63" },
  { id: "food", label: "음식점", icon: Utensils, color: "#cc4126" },
  { id: "cafe", label: "카페", icon: Coffee, color: "#8a5a35" },
  { id: "shopping", label: "쇼핑", icon: ShoppingBag, color: "#c2417a" },
  { id: "culture", label: "문화재", icon: Landmark, color: "#a16207" },
  { id: "nature", label: "자연", icon: Trees, color: "#2f7d3f" },
  { id: "stay", label: "숙소", icon: BedDouble, color: "#6d5bd0" },
  { id: "transport", label: "교통", icon: TrainFront, color: "#2f5d8a" },
  { id: "etc", label: "기타", icon: MapPin, color: "#6b665f" },
];

/** 핀 색상 선택지 */
/** 모두 흰 글씨·아이콘과 대비 4.5:1 이상 (지도 핀 위 흰 아이콘) */
export const PALETTE = ["#cc4126", "#0d6b63", "#2f5d8a", "#6d5bd0", "#c2417a", "#a16207", "#2f7d3f", "#8a5a35", "#14233b"];

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
