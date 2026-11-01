import { haversineKm, type LatLng } from "./directions.ts";

function pathKm(points: LatLng[]) {
  let km = 0;
  for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i]);
  return km;
}

/**
 * 하루 동선을 짧게: 첫 장소(보통 숙소·출발지)는 그대로 두고, 가장 가까운 곳부터 잇고,
 * 꼬인 구간을 뒤집어 푼다(2-opt). 돌아오는 길은 따지지 않는다.
 * ponytail: 직선거리 기준, O(n³). 하루 장소가 수십 곳 넘게 늘면 그때 손본다
 */
export function optimizeOrder<P extends LatLng>(points: P[]): P[] {
  if (points.length < 3) return points;
  const rest = points.slice(1);
  const route = [points[0]];
  while (rest.length) {
    const last = route[route.length - 1];
    let best = 0;
    for (let i = 1; i < rest.length; i++) if (haversineKm(last, rest[i]) < haversineKm(last, rest[best])) best = i;
    route.push(rest.splice(best, 1)[0]);
  }
  for (let improved = true; improved; ) {
    improved = false;
    for (let i = 1; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const next = [...route.slice(0, i), ...route.slice(i, k + 1).reverse(), ...route.slice(k + 1)];
        if (pathKm(next) < pathKm(route) - 1e-9) {
          route.splice(0, route.length, ...next);
          improved = true;
        }
      }
    }
  }
  return route;
}
