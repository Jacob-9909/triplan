import type { RouteLeg } from "@/lib/types";

export type LegMethod = RouteLeg["method"];

export interface DirectionsResult {
  durationMin: number;
  distanceKm: number;
  source: "api" | "estimate";
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** 이동수단별 평균 속도 (km/h) — API 실패 시 추정용 */
const AVG_SPEED_KMH: Record<LegMethod, number> = {
  walk: 4.5,
  transit: 22,
  taxi: 30,
  "rental-car": 40,
  bike: 14,
  plane: 700,
  ferry: 35,
};

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 예상 시간/거리 추정: 직선거리(haversine) × 우회계수(1.3) ÷ 이동수단별 평균속도.
 * (경로 API가 없으므로 추정값이며, 화면에 "(추정)"으로 표시된다.)
 */
export async function fetchDirections(
  from: LatLng,
  to: LatLng,
  method: LegMethod
): Promise<DirectionsResult> {
  return estimateDirections(from, to, method);
}

/** 동기 버전 (화면에 추정치를 바로 보여줄 때) */
export function estimateDirections(from: LatLng, to: LatLng, method: LegMethod): DirectionsResult {
  const straightKm = haversineKm(from, to);
  const distanceKm = Math.round(straightKm * 1.3 * 100) / 100;
  const speed = AVG_SPEED_KMH[method] ?? 20;
  const durationMin = Math.max(1, Math.round((distanceKm / speed) * 60));
  return { durationMin, distanceKm, source: "estimate" };
}

// 상자 남동쪽 귀퉁이(규슈 북부·쓰시마)는 일본이라 뺀다. 그 자리에 한국 땅은 없다
export const inKorea = (p: LatLng) =>
  p.lat > 33 && p.lat < 38.7 && p.lng > 124.5 && p.lng < 131 && !(p.lat < 34.9 && p.lng > 129.1);

/** 지도 앱 길찾기 링크: 한국 안은 카카오맵, 밖은 구글 지도. 출발지는 앱이 현재 위치로 잡는다 */
export function directionsUrl(p: LatLng & { name: string }): string {
  return inKorea(p)
    ? `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

/** 구글 지도 travelmode. 비행기·배는 지도 앱 길찾기가 없다 */
const GOOGLE_MODE: Partial<Record<LegMethod, string>> = {
  walk: "walking",
  transit: "transit",
  taxi: "driving",
  "rental-car": "driving",
  bike: "bicycling",
};

/** 구간 길찾기 링크: 출발지와 이동수단까지 넘긴다. 비행기·배면 null */
export function legDirectionsUrl(from: LatLng & { name: string }, to: LatLng & { name: string }, method: LegMethod): string | null {
  const mode = GOOGLE_MODE[method];
  if (!mode) return null;
  // ponytail: 카카오맵 웹 링크는 이동수단을 못 넘긴다. 앱에서 고르면 된다
  if (inKorea(from) && inKorea(to)) {
    const pt = (p: typeof from) => `${encodeURIComponent(p.name)},${p.lat},${p.lng}`;
    return `https://map.kakao.com/link/from/${pt(from)}/to/${pt(to)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=${mode}`;
}
