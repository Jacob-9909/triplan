"use client";

import { useEffect, type RefObject } from "react";
import { apiPost } from "@/lib/api";
import type { MapCameraRef } from "./mapKit";
import { hasHangul, sourceLang } from "./translateName";

/** 지도에 보이는 라벨 중 이 개수씩 묶어 번역을 요청한다 */
const BATCH = 20;
/** 한 번 화면 이동에 새로 번역할 최대 라벨 수 (무료 한도 보호) */
const PER_VIEW = 60;
/** match 식이 너무 커지지 않게 기억할 최대 번역 수 */
const MAX_DICT = 3000;

// 지도를 다시 열어도 다시 묻지 않도록 페이지 전체에서 공유한다
const dict = new Map<string, string>();
const asked = new Set<string>();
let quotaHit = false;

interface LabelMap {
  getStyle(): { layers?: Array<{ id: string; type: string; layout?: Record<string, unknown> }> };
  setLayoutProperty(layer: string, name: string, value: unknown): void;
  queryRenderedFeatures(options: { layers: string[] }): Array<{ properties?: Record<string, unknown> }>;
  on(type: "idle", fn: () => void): void;
  off(type: "idle", fn: () => void): void;
}

/** 한국어 이름 → 번역 사전 → 현지 이름 순으로 고르는 라벨 식 */
function labelExpression() {
  if (dict.size === 0) return ["coalesce", ["get", "name:ko"], ["get", "name"]];
  const pairs: string[] = [];
  for (const [name, ko] of dict) pairs.push(name, ko);
  return ["coalesce", ["get", "name:ko"], ["match", ["get", "name"], ...pairs, ["get", "name"]]];
}

/**
 * 지도 라벨 중 한국어 이름이 없는 것(가게·시설·길 이름 등)을 번역해 한국어로 바꿔 보여 준다.
 * 화면 이동이 끝날 때마다 보이는 라벨만 모아 서버(DB 캐시 + 무료 번역 API)에 묻는다.
 */
export function useKoreanLabels(
  mapRef: RefObject<MapCameraRef | null>,
  ready: boolean,
  enabled: boolean,
  country?: string | null
) {
  useEffect(() => {
    if (!enabled || !ready) return;
    const map = (mapRef.current as unknown as { getMap?: () => LabelMap } | null)?.getMap?.();
    if (!map) return;

    // 지명을 그리는 라벨 레이어 (도로 번호·번지 같은 라벨은 제외)
    const layers = (map.getStyle().layers ?? [])
      .filter((l) => l.type === "symbol" && JSON.stringify(l.layout?.["text-field"] ?? "").includes("name"))
      .map((l) => l.id);
    if (layers.length === 0) return;

    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let shown = 0;

    const apply = () => {
      if (dict.size === shown) return;
      shown = dict.size;
      const expr = labelExpression();
      for (const id of layers) map.setLayoutProperty(id, "text-field", expr);
    };

    const collect = async () => {
      if (quotaHit) return;
      const names = new Set<string>();
      for (const f of map.queryRenderedFeatures({ layers })) {
        const name = f.properties?.name;
        if (typeof name !== "string" || f.properties?.["name:ko"]) continue;
        if (!name.trim() || name.length > 100 || hasHangul(name) || asked.has(name)) continue;
        names.add(name);
        if (names.size >= PER_VIEW) break;
      }
      // 원문 언어별로 묶어서 BATCH개씩 요청
      const chunks: Array<{ from: string; names: string[] }> = [];
      const byLang = new Map<string, string[]>();
      for (const n of names) {
        const from = sourceLang(n, country);
        byLang.set(from, [...(byLang.get(from) ?? []), n]);
        asked.add(n);
      }
      for (const [from, list] of byLang) {
        for (let i = 0; i < list.length; i += BATCH) chunks.push({ from, names: list.slice(i, i + BATCH) });
      }
      for (let i = 0; i < chunks.length; i++) {
        if (!alive || quotaHit) break;
        try {
          const res = await apiPost<{ translations: Record<string, string | null>; quota: boolean }>(
            "/api/translate",
            chunks[i]
          );
          for (const [name, ko] of Object.entries(res.translations)) {
            if (ko && dict.size < MAX_DICT) dict.set(name, ko);
          }
          if (res.quota) quotaHit = true;
        } catch {
          // 번역 실패해도 지도는 현지 이름으로 그대로 보인다. 남은 이름은 다음 이동 때 다시 시도
          chunks.slice(i).forEach((c) => c.names.forEach((n) => asked.delete(n)));
          break;
        }
        if (alive) apply();
      }
    };

    const onIdle = () => {
      clearTimeout(timer);
      timer = setTimeout(collect, 350);
    };

    apply();
    map.on("idle", onIdle);
    onIdle();
    return () => {
      alive = false;
      clearTimeout(timer);
      map.off("idle", onIdle);
    };
  }, [mapRef, ready, enabled, country]);
}
