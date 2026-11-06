"use client";

import { useEffect, useState } from "react";
import { Check, ImageOff, Link2 } from "lucide-react";
import type { Trip } from "@/lib/types";
import { apiGet, photoUrl } from "@/lib/api";
import Sheet from "@/features/ui/Sheet";
import CoverPhoto from "@/features/ui/CoverPhoto";
import { useT } from "@/i18n/I18nProvider";

interface TripPhoto {
  id: string;
  point_id: string;
  point_name: string;
  day_number: number | null;
}

/** 커버 사진 고르기: 이 여행 장소 사진, 사진 주소(https), 또는 기본 도시 사진 */
export default function CoverPicker({
  trip,
  open,
  onClose,
  onPick,
}: {
  trip: Trip;
  open: boolean;
  onClose: () => void;
  /** null 이면 기본 사진으로 */
  onPick: (url: string | null) => Promise<void> | void;
}) {
  const t = useT();
  const [photos, setPhotos] = useState<TripPhoto[] | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    apiGet<TripPhoto[]>(`/api/point-photos?trip_id=${trip.id}`)
      .then(setPhotos)
      .catch(() => setPhotos([]));
  }, [open, trip.id]);

  const current = trip.cover_image_url;
  async function pick(value: string | null) {
    setError(null);
    try {
      await onPick(value);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("저장하지 못했어요."));
    }
  }
  function close() {
    setError(null);
    onClose();
  }

  return (
    <Sheet open={open} onClose={close} title={t("커버 사진 바꾸기")}>
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => void pick(null)}
          className={`group relative block h-28 w-full overflow-hidden rounded-2xl text-left ring-2 transition ${
            !current ? "ring-primary" : "ring-transparent hover:ring-primary/40"
          }`}
        >
          <CoverPhoto country={trip.country} continent={trip.continent} city={trip.region} title={trip.title} />
          <span className="absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 text-sm font-bold text-white">
            {!current && <Check size={15} aria-hidden />} {t("기본 사진 (여행지)")}
          </span>
        </button>

        <section>
          <h3 className="mb-2 text-xs font-bold text-foreground/65">{t("이 여행에서 찍은 사진")}</h3>
          {photos === null ? (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton aspect-square rounded-xl" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <p className="flex items-center gap-2 rounded-2xl bg-surface-muted px-3 py-3 text-sm text-foreground/70">
              <ImageOff size={16} aria-hidden /> {t("아직 올린 사진이 없어요. 장소 상세에서 사진을 올리면 여기서 고를 수 있어요.")}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p) => {
                const value = `/api/point-photos/${p.id}`;
                const on = current === value;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => void pick(value)}
                      aria-pressed={on}
                      title={p.point_name}
                      className={`relative block aspect-square w-full overflow-hidden rounded-xl ring-2 transition ${
                        on ? "ring-primary" : "ring-transparent hover:ring-primary/40"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- 앱 API 가 주는 사진 */}
                      <img src={photoUrl(p.id)} alt={p.point_name} loading="lazy" className="h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-semibold text-white">
                        {p.day_number ? `Day ${p.day_number} · ` : ""}
                        {p.point_name}
                      </span>
                      {on && (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                          <Check size={12} aria-hidden />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^https:\/\//i.test(url.trim())) {
              setError(t("https:// 로 시작하는 사진 주소를 넣어 주세요."));
              return;
            }
            void pick(url.trim());
          }}
        >
          <label htmlFor="cover-url" className="field-label">
            {t("사진 주소로 넣기")}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/45" aria-hidden />
              <input
                id="cover-url"
                className="input pl-9"
                inputMode="url"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-ink px-4 text-sm" disabled={!url.trim()}>
              {t("적용")}
            </button>
          </div>
        </form>
        {error && <p className="text-sm font-semibold text-accent">{error}</p>}
      </div>
    </Sheet>
  );
}
