"use client";

import { motion } from "framer-motion";
import type { MapPoint } from "@/lib/types";
import { getCategoryColor, getCategoryLabel } from "./categories";

export interface PinMarkerProps {
  category: MapPoint["category"];
  /** 핀 위에 표시할 순번 등 라벨 (선택) */
  label?: string | number;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * 재사용 가능한 압정핀 마커.
 * 카테고리 색상 머리 + 흰색 테두리 + 꼬리가 있는 티어드롭 핀.
 */
export default function PinMarker({ category, label, selected = false, onClick }: PinMarkerProps) {
  const color = getCategoryColor(category);

  return (
    <motion.button
      type="button"
      aria-label={`${getCategoryLabel(category)} 핀`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="relative flex cursor-pointer items-end justify-center outline-none"
      style={{ width: 32, height: 40 }}
      animate={selected ? { scale: [1, 1.25, 1] } : { scale: 1 }}
      transition={selected ? { duration: 0.3, ease: "easeOut" } : undefined}
      whileHover={{ scale: 1.15 }}
    >
      {/* 그림자 */}
      <span
        aria-hidden
        className="absolute bottom-[-4px] left-1/2 h-[5px] w-[14px] -translate-x-1/2 rounded-full bg-black/15 blur-[2px]"
      />
      {/* 핀 본체 (티어드롭) */}
      <span
        aria-hidden
        className="flex h-[28px] w-[28px] items-center justify-center rounded-full rounded-bl-none border-[3px] border-white shadow-md"
        style={{
          backgroundColor: color,
          transform: "rotate(-45deg)",
          boxShadow: "0 4px 10px rgba(28,43,58,0.25)",
        }}
      >
        <span className="h-[7px] w-[7px] rounded-full bg-white" style={{ transform: "rotate(45deg)" }} />
      </span>
      {/* 순번 라벨 */}
      {label !== undefined && (
        <span
          className="absolute left-1/2 top-[-14px] min-w-[20px] -translate-x-1/2 rounded-full px-1 text-center text-[10px] font-bold leading-[16px] text-white"
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
      )}
    </motion.button>
  );
}
