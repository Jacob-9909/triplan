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

function haversineKm(a: LatLng, b: LatLng): number {
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
 * 서버 API로 예상 시간/거리 조회.
 * - POST /api/route/directions { from:{lat,lng}, to:{lat,lng}, method }
 * - 응답 { durationMin, distanceKm }
 * 실패 시 직선거리(haversine) × 우회계수 ÷ 평균속도로 추정 fallback.
 */
export async function fetchDirections(
  from: LatLng,
  to: LatLng,
  method: LegMethod
): Promise<DirectionsResult> {
  try {
    const res = await fetch("/api/route/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: { lat: from.lat, lng: from.lng }, to: { lat: to.lat, lng: to.lng }, method }),
    });
    if (!res.ok) throw new Error(`directions api ${res.status}`);
    const data: unknown = await res.json();
    if (
      data &&
      typeof data === "object" &&
      typeof (data as { durationMin?: unknown }).durationMin === "number" &&
      typeof (data as { distanceKm?: unknown }).distanceKm === "number"
    ) {
      const { durationMin, distanceKm } = data as { durationMin: number; distanceKm: number };
      return {
        durationMin: Math.max(0, Math.round(durationMin)),
        distanceKm: Math.max(0, Math.round(distanceKm * 100) / 100),
        source: "api",
      };
    }
    throw new Error("invalid directions response");
  } catch {
    // fallback: 직선거리 * 우회계수(1.3) / 평균속도
    const straightKm = haversineKm(from, to);
    const distanceKm = Math.round(straightKm * 1.3 * 100) / 100;
    const speed = AVG_SPEED_KMH[method] ?? 20;
    const durationMin = Math.max(1, Math.round((distanceKm / speed) * 60));
    return { durationMin, distanceKm, source: "estimate" };
  }
}
