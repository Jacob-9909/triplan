"use client";

import { useEffect, useRef, useState } from "react";
import { Plane } from "lucide-react";
import { searchIata, type IataCity } from "./iata";
import { searchInputClass } from "./SearchCard";

interface IataInputProps {
  label: string;
  value: string; // 선택된 IATA 코드
  onChange: (code: string) => void;
  placeholder?: string;
}

/** IATA 코드 자동완성 입력 (한글/영문/코드 검색 지원) */
export default function IataInput({ label, value, onChange, placeholder }: IataInputProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const results = query ? searchIata(query) : [];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(c: IataCity) {
    onChange(c.code);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]/60">
        <Plane size={13} className="text-[var(--color-primary)]" />
        {label}
      </label>
      <input
        className={searchInputClass}
        value={open ? query : value || ""}
        placeholder={placeholder ?? "도시명 또는 코드 (예: 오사카, NRT)"}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHighlight(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={(e) => {
          if (!open || !results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(results[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {value && !open && (
        <span className="pointer-events-none absolute right-3 top-[30px] text-xs font-semibold text-[var(--color-primary-strong)] tabular-nums">
          {value}
        </span>
      )}
      {open && query && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-white py-1 shadow-lg"
        >
          {results.length === 0 && (
            <li className="px-3 py-2 text-xs text-[var(--foreground)]/50">검색 결과가 없습니다</li>
          )}
          {results.map((c, i) => (
            <li key={c.code}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(c)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                  i === highlight ? "bg-[var(--color-primary-soft)]" : ""
                }`}
              >
                <span>
                  {c.city}{" "}
                  <span className="text-xs text-[var(--foreground)]/50">{c.country}</span>
                </span>
                <span className="ml-2 rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs font-bold text-[var(--color-primary-strong)] tabular-nums">
                  {c.code}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
