import type { RouteLeg, RouteOption } from "@/lib/types";
import { estimateDirections, haversineKm, inKorea, type LatLng } from "./directions.ts";

export type RouteProvider = "valhalla-pedestrian" | "valhalla-auto" | "valhalla-bicycle" | "odsay";

/** 이동수단별 경로 출처. 비행기·배와 한국 밖 대중교통은 없음(null) */
export function providerFor(method: RouteLeg["method"], from: LatLng, to: LatLng): RouteProvider | null {
  switch (method) {
    case "walk":
      return "valhalla-pedestrian";
    case "taxi":
    case "rental-car":
      return "valhalla-auto";
    case "bike":
      return "valhalla-bicycle";
    case "transit":
      return inKorea(from) && inKorea(to) ? "odsay" : null;
    default:
      return null;
  }
}

/** 받을 때보다 양 끝 핀이 20m 넘게 옮겨졌는지 */
export function isStale(opt: Pick<RouteOption, "from_lat" | "from_lng" | "to_lat" | "to_lng">, from: LatLng, to: LatLng): boolean {
  const moved = (a: LatLng, b: LatLng) => haversineKm(a, b) * 1000 > 20;
  return moved({ lat: opt.from_lat, lng: opt.from_lng }, from) || moved({ lat: opt.to_lat, lng: opt.to_lng }, to);
}

/** 사람이 고르기 전 기본 이동수단: 걸어서 15분 이하면 도보 */
export function defaultMethod(from: LatLng, to: LatLng): "walk" | "transit" {
  return estimateDirections(from, to, "walk").durationMin <= 15 ? "walk" : "transit";
}

/** 구간 카드에서 비교할 이동수단. 자전거·렌터카로 골라 둔 구간은 그것도 함께 */
export function chipMethods(leg: Pick<RouteLeg, "method">): RouteLeg["method"][] {
  const base: RouteLeg["method"][] = ["transit", "walk", "taxi"];
  return leg.method === "bike" || leg.method === "rental-car" ? [...base, leg.method] : base;
}
