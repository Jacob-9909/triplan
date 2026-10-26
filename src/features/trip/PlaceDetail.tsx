"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, ImagePlus, Link2, Loader2, Trash2, X } from "lucide-react";
import type { MapPoint, PointPhoto } from "@/lib/types";
import { apiDelete, apiGet, apiUpload, photoUrl } from "@/lib/api";
import { getCategoryMeta } from "@/features/route/meta";
import Sheet from "@/features/ui/Sheet";

const MAX_EDGE = 1600;

/** 브라우저에서 긴 변 1600px JPEG로 줄인다 (용량·업로드 시간 절약, EXIF 회전 반영) */
async function shrink(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.82)
  );
  return { blob, width, height };
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 장소 상세: 사진 · 링크 · 메모 */
export default function PlaceDetail({
  point,
  canEdit,
  onClose,
  onSave,
}: {
  point: MapPoint | null;
  canEdit: boolean;
  onClose: () => void;
  /** 메모·링크 저장. 실패하면 오류 메시지를 돌려준다 */
  onSave: (id: string, patch: Partial<Pick<MapPoint, "memo" | "link_url">>) => Promise<string | null>;
}) {
  return (
    <Sheet open={point !== null} onClose={onClose} title={point ? <Title point={point} /> : null}>
      {point && <Body key={point.id} point={point} canEdit={canEdit} onSave={onSave} />}
    </Sheet>
  );
}

function Title({ point }: { point: MapPoint }) {
  const meta = getCategoryMeta(point.category);
  const Icon = meta.icon;
  return (
    <span className="flex items-center gap-2">
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${meta.bg}`}>
        <Icon size={16} className={meta.color} />
      </span>
      <span className="truncate">{point.name}</span>
    </span>
  );
}

function Body({
  point,
  canEdit,
  onSave,
}: {
  point: MapPoint;
  canEdit: boolean;
  onSave: (id: string, patch: Partial<Pick<MapPoint, "memo" | "link_url">>) => Promise<string | null>;
}) {
  const [photos, setPhotos] = useState<PointPhoto[] | null>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [memo, setMemo] = useState(point.memo ?? "");
  const [link, setLink] = useState(point.link_url ?? "");
  const [saved, setSaved] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGet<PointPhoto[]>(`/api/point-photos?point_id=${point.id}`)
      .then(setPhotos)
      .catch(() => setPhotos([]));
  }, [point.id]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    for (const file of Array.from(files)) {
      setUploading((n) => n + 1);
      try {
        const { blob, width, height } = await shrink(file);
        const form = new FormData();
        form.append("point_id", point.id);
        form.append("file", blob, "photo.jpg");
        form.append("width", String(width));
        form.append("height", String(height));
        const photo = await apiUpload<PointPhoto>("/api/point-photos", form);
        setPhotos((prev) => [...(prev ?? []), photo]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "사진을 올리지 못했어요.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function removePhoto(id: string) {
    await apiDelete(`/api/point-photos/${id}`);
    setPhotos((prev) => (prev ?? []).filter((p) => p.id !== id));
    setViewer(null);
  }

  async function save(patch: Partial<Pick<MapPoint, "memo" | "link_url">>, label: string) {
    const err = await onSave(point.id, patch);
    setError(err);
    if (!err) {
      setSaved(label);
      setTimeout(() => setSaved(null), 1500);
    }
  }

  const linkTrim = link.trim();
  const linkValid = linkTrim === "" || /^https?:\/\//i.test(linkTrim);

  return (
    <div className="space-y-5">
      {/* 사진 */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold">사진 {photos && photos.length > 0 && <span className="text-foreground/40">{photos.length}</span>}</h3>
          {canEdit && (
            <button onClick={() => fileRef.current?.click()} className="btn btn-ghost px-3 py-1.5 text-xs">
              <ImagePlus size={14} /> 사진 추가
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void upload(e.target.files)}
        />
        {photos === null ? (
          <div className="skeleton h-24 rounded-2xl" />
        ) : photos.length === 0 && uploading === 0 ? (
          canEdit ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-border-subtle py-7 text-sm text-foreground/50 transition hover:border-primary hover:text-primary-strong"
            >
              <ImagePlus size={22} />
              눌러서 사진을 올려 보세요 (앨범·카메라)
            </button>
          ) : (
            <p className="rounded-2xl bg-surface-muted py-6 text-center text-sm text-foreground/45">아직 사진이 없어요</p>
          )
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setViewer(i)}
                className="relative aspect-square overflow-hidden rounded-xl bg-surface-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 권한 검사하는 API가 주는 이미지 */}
                <img src={photoUrl(p.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </motion.button>
            ))}
            {Array.from({ length: uploading }).map((_, i) => (
              <div key={`u${i}`} className="flex aspect-square items-center justify-center rounded-xl bg-surface-muted">
                <Loader2 size={18} className="animate-spin text-primary" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 링크 */}
      <section>
        <h3 className="mb-2 text-sm font-bold">링크</h3>
        {canEdit ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/35" />
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="예약·후기·공식 사이트 주소 (https://…)"
                inputMode="url"
                className="input pl-9"
              />
            </div>
            <button
              onClick={() => void save({ link_url: linkTrim || null }, "link")}
              disabled={!linkValid || linkTrim === (point.link_url ?? "")}
              className="btn btn-primary shrink-0 px-4 text-sm disabled:opacity-40"
            >
              {saved === "link" ? "저장됨" : "저장"}
            </button>
          </div>
        ) : null}
        {!linkValid && <p className="mt-1.5 text-xs text-accent">https:// 로 시작하는 주소를 넣어 주세요.</p>}
        {point.link_url && (
          <a
            href={point.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 rounded-xl bg-primary-soft px-3.5 py-2.5 text-sm font-semibold text-primary-strong"
          >
            <ExternalLink size={15} /> {hostOf(point.link_url)}
          </a>
        )}
        {!canEdit && !point.link_url && <p className="text-sm text-foreground/45">등록된 링크가 없어요</p>}
      </section>

      {/* 메모 */}
      <section>
        <h3 className="mb-2 flex items-center justify-between text-sm font-bold">
          메모 {saved === "memo" && <span className="text-xs font-medium text-mint">저장됨</span>}
        </h3>
        {canEdit ? (
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={() => memo !== (point.memo ?? "") && void save({ memo: memo.trim() || null }, "memo")}
            rows={3}
            placeholder="영업시간, 꼭 먹을 메뉴, 주의할 점…"
            className="input resize-none"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-foreground/70">{point.memo || "메모가 없어요"}</p>
        )}
      </section>

      {error && <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-[#c2410c]">{error}</p>}

      {/* 사진 크게 보기: 시트는 transform이 걸려 fixed가 갇히므로 body로 포털 */}
      {createPortal(
      <AnimatePresence>
        {viewer !== null && photos?.[viewer] && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewer(null)}
          >
            <motion.img
              key={photos[viewer].id}
              src={photoUrl(photos[viewer].id)}
              alt=""
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-h-full max-w-full rounded-xl object-contain"
            />
            <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex gap-2">
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void removePhoto(photos[viewer].id);
                  }}
                  aria-label="사진 삭제"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
                >
                  <Trash2 size={17} />
                </button>
              )}
              <button aria-label="닫기" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
}
