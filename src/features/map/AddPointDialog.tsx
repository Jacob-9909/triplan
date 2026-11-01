"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import type { MapPoint } from "@/lib/types";
import StylePicker from "./StylePicker";
import { hasHangul, translateName, withKorean } from "./translateName";
import { usePrefs } from "@/i18n/I18nProvider";

/** AddPointDialog가 만들어내는 포인트 초안 (id/trip_id/created_at은 상위에서 채움) */
export interface PointDraft {
  name: string;
  category: MapPoint["category"];
  /** 핀 색상. null이면 분류 기본색 */
  color: string | null;
  memo: string | null;
  lat: number;
  lng: number;
}

export interface AddPointDialogProps {
  open: boolean;
  latlng: { lat: number; lng: number } | null;
  /** 지도 POI 클릭 등으로 미리 채울 값 */
  prefill?: { name?: string; category?: MapPoint["category"] };
  /** 여행 나라 (현지어 장소 이름 번역 힌트) */
  country?: string | null;
  onCancel: () => void;
  onSave: (draft: PointDraft) => void;
}

/** open일 때만 마운트되어 상태가 매번 초기화되는 폼 */
function PointForm({
  latlng,
  prefill,
  country,
  onCancel,
  onSave,
}: Pick<AddPointDialogProps, "latlng" | "prefill" | "country" | "onCancel" | "onSave">) {
  const { t, locale } = usePrefs();
  const [name, setName] = useState(prefill?.name ?? "");
  // 영어 화면에서는 현지·영문 이름 그대로 쓴다 (한국어 번역 요청 없음)
  const needsKorean = locale === "ko" && !!prefill?.name && !hasHangul(prefill.name);
  const [translating, setTranslating] = useState(needsKorean);
  const edited = useRef(false);
  const [category, setCategory] = useState<MapPoint["category"]>(prefill?.category ?? "attraction");
  const [color, setColor] = useState<string | null>(null);
  const [memo, setMemo] = useState("");

  // 지도에서 고른 장소 이름이 현지어뿐이면 오른쪽에 한국어를 붙여 준다 (직접 고쳤으면 건드리지 않음)
  useEffect(() => {
    if (!needsKorean || !prefill?.name) return;
    const original = prefill.name;
    let alive = true;
    translateName(original, country).then((ko) => {
      if (!alive) return;
      setTranslating(false);
      if (ko && !edited.current) setName(withKorean(original, ko));
    });
    return () => {
      alive = false;
    };
  }, [needsKorean, prefill?.name, country]);

  const canSave = name.trim().length > 0 && latlng !== null;

  const handleSave = () => {
    if (!canSave || !latlng) return;
    onSave({
      name: name.trim(),
      category,
      color,
      memo: memo.trim() ? memo.trim() : null,
      lat: latlng.lat,
      lng: latlng.lng,
    });
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t("새 포인트 추가")}
      className="card max-h-[90dvh] w-full max-w-lg overflow-y-auto p-5"
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
          {t("장소 추가")}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("닫기")}
          className="rounded-lg p-1.5 text-foreground/68 transition hover:bg-primary-soft hover:text-primary-strong"
        >
          <X size={18} />
        </button>
      </div>

      <label htmlFor="add-point-name" className="mb-1 block text-xs font-semibold text-foreground/72">
        {t("이름")}
      </label>
      <input
        id="add-point-name"
        autoFocus
        value={name}
        onChange={(e) => {
          edited.current = true;
          setName(e.target.value);
        }}
        placeholder={t("예: 후쿠오카 타워")}
        className={`${translating ? "mb-1" : "mb-4"} w-full rounded-xl border border-border-subtle bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20`}
      />
      {translating && <p className="mb-4 text-[11px] text-foreground/68">{t("한국어 이름 찾는 중…")}</p>}

      <p className="mb-2 text-xs font-semibold text-foreground/72">{t("분류 · 핀 색")}</p>
      <div className="mb-4">
        <StylePicker
          category={category}
          color={color}
          onChange={(next) => {
            setCategory(next.category);
            setColor(next.color);
          }}
        />
      </div>

      <label htmlFor="add-point-memo" className="mb-1 block text-xs font-semibold text-foreground/72">
        {t("메모")}
      </label>
      <textarea
        id="add-point-memo"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        rows={2}
        placeholder={t("예: 야경 명소, 오후 6시 이후 방문 추천")}
        className="mb-1 w-full resize-none rounded-xl border border-border-subtle bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {latlng && (
        <p className="mb-4 text-[11px] tabular-nums text-foreground/68">
          {t("위치 확정: {lat}, {lng}", { lat: latlng.lat.toFixed(5), lng: latlng.lng.toFixed(5) })}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-semibold text-foreground/70 transition hover:bg-primary-soft"
        >
          {t("취소")}
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="btn btn-primary flex-1 px-4 text-sm font-bold"
        >
          {t("추가하기")}
        </button>
      </div>
    </motion.div>
  );
}

/**
 * 지도 클릭으로 위치를 확정한 뒤 포인트 정보를 입력하는 모달.
 */
export default function AddPointDialog({ open, latlng, prefill, country, onCancel, onSave }: AddPointDialogProps) {
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
            country={country}
            onCancel={onCancel}
            onSave={onSave}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
