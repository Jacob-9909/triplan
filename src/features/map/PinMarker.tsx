"use client";

import { motion } from "framer-motion";
import type { MapPoint } from "@/lib/types";
import { categoryStyle } from "./pointStyle";

export interface PinMarkerProps {
  category: MapPoint["category"];
  /** 핀 색상 (없으면 분류 기본색) */
  color?: string | null;
  /** 핀 위에 표시할 순번 등 라벨 (선택) */
  label?: string | number;
  selected?: boolean;
  onClick?: () => void;
  /** 장소 이름 (스크린리더용) */
  name?: string;
}

/**
 * 분류 아이콘이 들어간 티어드롭 핀. 색은 장소마다 지정할 수 있다.
 */
export default function PinMarker({ category, color, label, selected = false, onClick, name }: PinMarkerProps) {
  const style = categoryStyle(category);
  const fill = color || style.color;
  const Icon = style.icon;

  return (
    <motion.button
      type="button"
      aria-label={[label != null ? `${label}번` : null, name, style.label].filter(Boolean).join(" · ")}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="relative flex cursor-pointer items-end justify-center outline-none"
      style={{ width: 36, height: 44 }}
      animate={selected ? { scale: [1, 1.22, 1.1] } : { scale: 1 }}
      transition={selected ? { duration: 0.3, ease: "easeOut" } : undefined}
      whileHover={{ scale: 1.12 }}
    >
      {/* 그림자 */}
      <span
        aria-hidden
        className="absolute bottom-[-4px] left-1/2 h-[5px] w-[14px] -translate-x-1/2 rounded-full bg-black/20 blur-[2px]"
      />
      {/* 핀 본체 (티어드롭) */}
      <span
        aria-hidden
        className="flex h-[32px] w-[32px] items-center justify-center rounded-full rounded-bl-none border-[2.5px] border-white"
        style={{
          backgroundColor: fill,
          transform: "rotate(-45deg)",
          boxShadow: selected ? `0 0 0 4px ${fill}40, 0 4px 10px rgba(13,27,42,0.3)` : "0 4px 10px rgba(13,27,42,0.28)",
        }}
      >
        <Icon size={15} strokeWidth={2.4} className="text-white" style={{ transform: "rotate(45deg)" }} />
      </span>
      {/* 순번 라벨 */}
      {label !== undefined && (
        <span
          className="absolute -right-1 -top-1.5 min-w-[18px] rounded-full border-2 border-white px-1 text-center text-[10px] font-bold leading-[14px] text-white"
          style={{ backgroundColor: "#14233b" }}
        >
          {label}
        </span>
      )}
    </motion.button>
  );
}
