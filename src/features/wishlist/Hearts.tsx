"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";

/** 우선순위 1~3을 하트로 표시하고, onChange가 있으면 눌러서 바꾼다 */
export default function Hearts({
  value,
  onChange,
  size = 16,
  light = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  /** 사진 위에서 쓰는 흰색 버전 */
  light?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? "radiogroup" : undefined}>
      {[1, 2, 3].map((n) => {
        const on = n <= value;
        const heart = (
          <Heart
            size={size}
            className={on ? "text-accent" : light ? "text-white/50" : "text-foreground/20"}
            fill={on ? "currentColor" : "none"}
            strokeWidth={2.2}
          />
        );
        return onChange ? (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`우선순위 ${n}`}
            whileTap={{ scale: 0.75 }}
            animate={on ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            transition={{ duration: 0.25 }}
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            {heart}
          </motion.button>
        ) : (
          <span key={n}>{heart}</span>
        );
      })}
    </span>
  );
}
