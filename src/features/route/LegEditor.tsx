"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, Loader2, Route, Wallet } from "lucide-react";
import type { MapPoint, RouteLeg } from "@/lib/types";
import { fetchDirections, type DirectionsResult, type LatLng } from "./directions";
import { METHOD_META, type LegMethod } from "./meta";

const METHODS: LegMethod[] = ["walk", "transit", "taxi", "rental-car", "bike", "plane", "ferry"];

export interface LegEditorProps {
  from: Pick<MapPoint, "lat" | "lng">;
  to: Pick<MapPoint, "lat" | "lng">;
  method: RouteLeg["method"];
  /** 이동수단 변경 콜백 */
  onMethodChange?: (method: RouteLeg["method"]) => void;
  /** 예상시간/거리 계산 완료 콜백 (API 또는 fallback 추정값) */
  onCalculated?: (result: { durationMin: number; distanceKm: number; source: DirectionsResult["source"] }) => void;
  cost?: number | null;
  onCostChange?: (cost: number | null) => void;
}

export default function LegEditor({
  from,
  to,
  method,
  onMethodChange,
  onCalculated,
  cost = null,
  onCostChange,
}: LegEditorProps) {
  const [result, setResult] = useState<DirectionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const requestSeq = useRef(0);
  const onCalculatedRef = useRef(onCalculated);
  useEffect(() => {
    onCalculatedRef.current = onCalculated;
  }, [onCalculated]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    let cancelled = false;

    fetchDirections(
      { lat: from.lat, lng: from.lng },
      { lat: to.lat, lng: to.lng },
      method
    )
      .then((res) => {
        if (cancelled || seq !== requestSeq.current) return;
        setResult(res);
        setLoading(false);
        onCalculatedRef.current?.(res);
      })
      .catch(() => {
        if (!cancelled && seq === requestSeq.current) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [from.lat, from.lng, to.lat, to.lng, method]);

  return (
    <div className="card p-3">
      <div className="flex flex-wrap gap-1.5">
        {METHODS.map((m) => {
          const meta = METHOD_META[m];
          const Icon = meta.icon;
          const isActive = m === method;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={isActive}
              onClick={() => onMethodChange?.(m)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? meta.activeClass
                  : "border-border-subtle bg-surface text-foreground/60 hover:border-primary hover:text-primary-strong"
              }`}
            >
              <Icon size={14} />
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-foreground/70">
        {loading ? (
          <span className="flex items-center gap-1.5">
            <Loader2 size={13} className="animate-spin text-primary" /> 경로 계산 중…
          </span>
        ) : result ? (
          <>
            <span className="flex items-center gap-1.5">
              <Clock3 size={13} className="text-primary-strong" />
              약 {result.durationMin}분
              {result.source === "estimate" && (
                <em className="not-italic text-[10px] text-foreground/40">(추정)</em>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <Route size={13} className="text-mint" />
              약 {result.distanceKm}km
            </span>
          </>
        ) : (
          <span className="text-foreground/40">이동 정보 없음</span>
        )}

        <label className="ml-auto flex items-center gap-1.5">
          <Wallet size={13} className="text-sand" />
          <span className="sr-only">이동 비용</span>
          <input
            type="number"
            min={0}
            value={cost ?? ""}
            placeholder="비용"
            onChange={(e) =>
              onCostChange?.(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))
            }
            className="w-20 rounded-lg border border-border-subtle bg-surface-muted px-2 py-1 text-right text-xs outline-none focus:border-primary"
          />
        </label>
      </div>
    </div>
  );
}

export type { LatLng };
