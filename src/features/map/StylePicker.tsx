"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { MapPoint } from "@/lib/types";
import { CATEGORIES, PALETTE, categoryStyle } from "./pointStyle";

/** 분류(아이콘)와 핀 색상 고르기. color가 null이면 분류 기본색 */
export default function StylePicker({
  category,
  color,
  onChange,
}: {
  category: MapPoint["category"];
  color: string | null;
  onChange: (next: { category: MapPoint["category"]; color: string | null }) => void;
}) {
  const active = color || categoryStyle(category).color;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-9">
        {CATEGORIES.map((c) => {
          const on = c.id === category;
          const Icon = c.icon;
          const tone = on ? active : c.color;
          return (
            <motion.button
              key={c.id}
              type="button"
              whileTap={{ scale: 0.92 }}
              aria-pressed={on}
              onClick={() => onChange({ category: c.id, color })}
              className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-semibold transition ${
                on ? "border-transparent shadow-sm" : "border-border-subtle text-foreground/65 hover:border-foreground/20"
              }`}
              style={on ? { backgroundColor: `${tone}1f`, color: tone, borderColor: tone } : undefined}
            >
              <Icon size={18} style={on ? undefined : { color: c.color }} />
              {c.label}
            </motion.button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-foreground/62">핀 색</span>
        <button
          type="button"
          onClick={() => onChange({ category, color: null })}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            color === null ? "border-foreground bg-foreground text-white" : "border-border-subtle text-foreground/65"
          }`}
        >
          기본
        </button>
        {PALETTE.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={`색상 ${hex}`}
            onClick={() => onChange({ category, color: hex })}
            className="flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 transition active:scale-90"
            style={{ backgroundColor: hex, boxShadow: color === hex ? `0 0 0 2px var(--surface), 0 0 0 4px ${hex}` : undefined }}
          >
            {color === hex && <Check size={14} className="text-white" strokeWidth={3} />}
          </button>
        ))}
      </div>
    </div>
  );
}
