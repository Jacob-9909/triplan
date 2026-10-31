"use client";

import { motion } from "framer-motion";

const QUICK = [1000, 5000, 10000, 50000];

/** 12000 → "1만 2천원" */
export function readKrw(n: number): string {
  if (!n) return "0원";
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  const chun = Math.floor(rest / 1000);
  const won = rest % 1000;
  const parts = [man && `${man.toLocaleString("ko-KR")}만`, chun && `${chun}천`, won && `${won}`].filter(Boolean);
  return `${parts.join(" ")}원`;
}

function quickLabel(v: number) {
  return v >= 10000 ? `+${v / 10000}만` : `+${v / 1000}천`;
}

/**
 * 원화 금액 입력: 콤마 자동, 한글 읽기, 빠른 더하기 버튼.
 * value가 null이면 비어 있는 상태(비용 없음).
 */
export default function MoneyInput({
  value,
  onChange,
  placeholder = "0",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  const n = value ?? 0;
  return (
    <div>
      <div className="flex items-baseline gap-2 border-b-2 border-border-subtle pb-1.5 transition focus-within:border-primary">
        <input
          inputMode="numeric"
          value={value == null ? "" : value.toLocaleString("ko-KR")}
          placeholder={placeholder}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 9);
            onChange(digits === "" ? null : Number(digits));
          }}
          className="min-w-0 flex-1 bg-transparent text-2xl font-bold tabular-nums outline-none placeholder:text-foreground/25"
        />
        <span className="text-lg font-bold text-foreground/68">원</span>
      </div>
      <p className="mt-1 h-4 text-xs text-foreground/68">{value ? readKrw(value) : "비용이 없으면 비워 두세요"}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <motion.button
            key={q}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => onChange(n + q)}
            className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground/70 transition hover:bg-primary-soft hover:text-primary-strong"
          >
            {quickLabel(q)}
          </motion.button>
        ))}
        {value != null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/68 hover:text-accent"
          >
            지우기
          </button>
        )}
      </div>
    </div>
  );
}
