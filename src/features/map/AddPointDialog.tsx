"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import type { MapPoint } from "@/lib/types";
import { ALL_CATEGORIES, getCategoryColor, getCategoryLabel } from "./categories";

/** AddPointDialog가 만들어내는 포인트 초안 (id/trip_id/created_at은 상위에서 채움) */
export interface PointDraft {
  name: string;
  category: MapPoint["category"];
  memo: string | null;
  lat: number;
  lng: number;
}

export interface AddPointDialogProps {
  open: boolean;
  latlng: { lat: number; lng: number } | null;
  /** 지도 POI 클릭 등으로 미리 채울 값 */
  prefill?: { name?: string; category?: MapPoint["category"] };
  onCancel: () => void;
  onSave: (draft: PointDraft) => void;
}

/** open일 때만 마운트되어 상태가 매번 초기화되는 폼 */
function PointForm({
  latlng,
  prefill,
  onCancel,
  onSave,
}: Pick<AddPointDialogProps, "latlng" | "prefill" | "onCancel" | "onSave">) {
  const [name, setName] = useState(prefill?.name ?? "");
  const [category, setCategory] = useState<MapPoint["category"]>(prefill?.category ?? "attraction");
  const [memo, setMemo] = useState("");

  const canSave = name.trim().length > 0 && latlng !== null;

  const handleSave = () => {
    if (!canSave || !latlng) return;
    onSave({
      name: name.trim(),
      category,
      memo: memo.trim() ? memo.trim() : null,
      lat: latlng.lat,
      lng: latlng.lng,
    });
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="새 포인트 추가"
      className="card w-full max-w-md p-5"
      initial={{ scale: 0.92, y: 24, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.95, y: 12, opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft" aria-hidden>
            <MapPin size={16} className="text-primary-strong" />
          </span>
          새 포인트 추가
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="닫기"
          className="rounded-lg p-1.5 text-foreground/50 transition hover:bg-primary-soft hover:text-primary-strong"
        >
          <X size={18} />
        </button>
      </div>

      <label htmlFor="add-point-name" className="mb-1 block text-xs font-semibold text-foreground/60">
        이름
      </label>
      <input
        id="add-point-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예: 후쿠오카 타워"
        className="mb-4 w-full rounded-xl border border-border-subtle bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      <p className="mb-2 text-xs font-semibold text-foreground/60">카테고리</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((c) => {
          const active = c === category;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(c)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
              style={
                active
                  ? { backgroundColor: getCategoryColor(c), borderColor: getCategoryColor(c), color: "#fff" }
                  : { borderColor: "var(--border)", color: "rgba(28,43,58,0.6)" }
              }
            >
              {getCategoryLabel(c)}
            </button>
          );
        })}
      </div>

      <label htmlFor="add-point-memo" className="mb-1 block text-xs font-semibold text-foreground/60">
        메모
      </label>
      <textarea
        id="add-point-memo"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        rows={2}
        placeholder="예: 야경 명소, 오후 6시 이후 방문 추천"
        className="mb-1 w-full resize-none rounded-xl border border-border-subtle bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {latlng && (
        <p className="mb-4 text-[11px] tabular-nums text-foreground/40">
          위치 확정: {latlng.lat.toFixed(5)}, {latlng.lng.toFixed(5)}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-semibold text-foreground/70 transition hover:bg-primary-soft"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          추가하기
        </button>
      </div>
    </motion.div>
  );
}

/**
 * 지도 클릭으로 위치를 확정한 뒤 포인트 정보를 입력하는 모달.
 */
export default function AddPointDialog({ open, latlng, prefill, onCancel, onSave }: AddPointDialogProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          onKeyDown={handleKeyDown}
        >
          <PointForm
            key={`${prefill?.name ?? ""}:${prefill?.category ?? ""}`}
            latlng={latlng}
            prefill={prefill}
            onCancel={onCancel}
            onSave={onSave}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
