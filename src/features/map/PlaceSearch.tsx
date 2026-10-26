"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import type { MapPoint } from "@/lib/types";
import { apiGet } from "@/lib/api";

/** 카카오 로컬 API 응답 문서 */
interface KakaoPlace {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string | null;
  x: string; // 경도(lng)
  y: string; // 위도(lat)
  category_group_code?: string;
  category_name?: string;
}

export interface PickedPlace {
  name: string;
  category: MapPoint["category"];
  lat: number;
  lng: number;
  address?: string;
}

/** 카카오 category_group_code → 앱 카테고리 */
function categoryFromKakao(code?: string): MapPoint["category"] {
  switch (code) {
    case "FD6": // 음식점
    case "CE7": // 카페
      return "food";
    case "AT4": // 관광명소
      return "attraction";
    case "AD5": // 숙박
      return "stay";
    case "CT1": // 문화시설
    case "PO3": // 공공기관
      return "culture";
    case "MT1": // 대형마트
    case "SH11": // 마켓
      return "shopping";
    default:
      return "etc";
  }
}

/**
 * 지도 위 장소 검색 (카카오 로컬 API 프록시 사용).
 * 결과를 선택하면 onPick으로 전달되고, 상위에서 핀 추가 다이얼로그가 미리 채워진 채 열린다.
 */
export default function PlaceSearch({
  onPick,
  center,
}: {
  onPick: (place: PickedPlace) => void;
  /** 검색 반경 우선 기준 좌표(선택) */
  center?: { lat: number; lng: number } | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length === 0) {
        setResults([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q });
        if (center) {
          params.set("x", String(center.lng));
          params.set("y", String(center.lat));
        }
        const data = await apiGet<{ documents?: KakaoPlace[] }>(`/api/places/search?${params.toString()}`);
        setResults((data.documents ?? []).slice(0, 8));
      } catch {
        setError("장소 검색에 실패했어요");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [center]
  );

  const handleChange = (v: string) => {
    setQuery(v);
    setOpen(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 400);
  };

  return (
    <div ref={boxRef} className="relative w-72 max-w-[80%]">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/55" />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="장소 검색 (해외는 영문·현지어)"
          className="w-full rounded-full border border-border-subtle bg-white/95 py-2 pl-9 pr-8 text-sm shadow-sm outline-none transition focus:border-primary"
        />
        {query && (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => {
              setQuery("");
              setResults([]);
              setError(null);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-foreground/55 hover:text-foreground/70"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {(open || loading) && (query.trim() || error) && (
        <div className="mt-1.5 w-full overflow-hidden rounded-xl border border-border-subtle bg-white/98 shadow-card">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-foreground/62">
              <Loader2 size={14} className="animate-spin" /> 검색 중…
            </div>
          )}
          {!loading && error && (
            <div className="px-3 py-2.5 text-xs text-accent">{error}</div>
          )}
          {!loading && !error && results.length === 0 && (
            <div className="px-3 py-2.5 text-xs text-foreground/60">검색 결과가 없어요</div>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick({
                    name: r.place_name,
                    category: categoryFromKakao(r.category_group_code),
                    lat: Number(r.y),
                    lng: Number(r.x),
                    address: r.road_address_name ?? r.address_name,
                  });
                }}
                className="flex w-full items-start gap-2 border-t border-border-subtle/60 px-3 py-2 text-left first:border-t-0 hover:bg-primary-soft/60"
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-primary-strong" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.place_name}</span>
                  <span className="block truncate text-[11px] text-foreground/60">
                    {r.road_address_name || r.address_name}
                  </span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
