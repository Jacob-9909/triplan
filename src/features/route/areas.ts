import type { MapPoint } from "@/lib/types";
import { estimateDirections, haversineKm } from "./directions.ts";
import { optimizeOrder } from "./optimize.ts";

/** 걸어서 다닐 만한 거리로 묶은 구역 하나 */
export interface AreaGroup {
  /** 서쪽 끝에서 시작해 동선 정리한 순서 */
  points: MapPoint[];
  /** 장소 사이 평균 도보(분) */
  avgWalkMin: number;
  /** 머무는 시간 + 도보 (분) */
  dayMin: number;
  /** 나눠 봐도 하루(9시간)보다 김 */
  tooLong: boolean;
  center: { lat: number; lng: number };
}

/** 어느 구역에도 넣지 않은 곳. nearestPlace 가 null 이면 3km 안에 다른 곳이 없다 */
export interface LoosePlace {
  point: MapPoint;
  /** 가장 가까운 장소 (구역 안이든 아니든) */
  nearestPlace: MapPoint | null;
  /** 그 장소가 든 구역 */
  nearestGroup: number | null;
  /** 그 장소까지 추정 도보(분) */
  walkMin: number | null;
}

/** 이웃으로 보는 직선거리(km). 하루보다 긴 구역은 다음 반경으로 다시 나눈다 */
const RADII = [1.2, 0.8, 0.5];
const MAX_DAY_MIN = 9 * 60;
const FAR_KM = 3;
// schedule.ts 의 DEFAULT_STAY 와 같은 값. 그 파일은 @/ 별칭을 불러서 node 자체 점검에서 읽을 수 없다
const DEFAULT_STAY = 60;

/** 반경 안의 장소끼리 이어지면 한 덩어리 (union-find) */
function components(points: MapPoint[], radiusKm: number): MapPoint[][] {
  const parent = points.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      if (haversineKm(points[i], points[j]) <= radiusKm) parent[find(i)] = find(j);
  const byRoot = new Map<number, MapPoint[]>();
  points.forEach((p, i) => byRoot.set(find(i), [...(byRoot.get(find(i)) ?? []), p]));
  return [...byRoot.values()];
}

function ordered(points: MapPoint[]): MapPoint[] {
  const start = [...points].sort((a, b) => a.lng - b.lng || a.id.localeCompare(b.id))[0];
  return optimizeOrder([start, ...points.filter((p) => p !== start)]);
}

function walks(order: MapPoint[]): number[] {
  return order.slice(1).map((p, i) => estimateDirections(order[i], p, "walk").durationMin);
}

function dayMinOf(points: MapPoint[]): number {
  const order = ordered(points);
  return order.reduce((s, p) => s + (p.stay_min ?? DEFAULT_STAY), 0) + walks(order).reduce((s, m) => s + m, 0);
}

/** 하루보다 긴 덩어리는 더 작은 반경으로, 그래도 안 되면 가장 먼 두 곳을 기준으로 둘로 나눈다 */
function splitLong(points: MapPoint[], radiusIdx: number): MapPoint[][] {
  if (points.length <= 2 || dayMinOf(points) <= MAX_DAY_MIN) return [points];
  for (let r = radiusIdx + 1; r < RADII.length; r++) {
    const parts = components(points, RADII[r]);
    if (parts.length > 1) return parts.flatMap((part) => splitLong(part, r));
  }
  let [a, b, best] = [points[0], points[1], -1];
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const d = haversineKm(points[i], points[j]);
      if (d > best) [a, b, best] = [points[i], points[j], d];
    }
  const near = (p: MapPoint) => haversineKm(p, a) <= haversineKm(p, b);
  const left = points.filter(near);
  const right = points.filter((p) => !near(p));
  // 둘로 나눠도 한쪽이 한 곳뿐이면 나누는 의미가 없다
  if (left.length < 2 || right.length < 2) return [points];
  return [...splitLong(left, RADII.length), ...splitLong(right, RADII.length)];
}

/**
 * 후보함 장소를 걸어서 다닐 만한 구역으로 묶는다. 계산만 하고 아무것도 바꾸지 않는다.
 * ponytail: 모든 쌍 거리 O(n²). 후보함이 수백 곳으로 늘면 격자로 나눠 비교한다
 */
export function groupAreas(input: MapPoint[]): { groups: AreaGroup[]; loose: LoosePlace[] } {
  const points = [...input].sort((a, b) => a.id.localeCompare(b.id));
  const parts = components(points, RADII[0]).flatMap((part) => splitLong(part, 0));

  const groups: AreaGroup[] = parts
    .filter((part) => part.length >= 2)
    .map((part) => {
      const order = ordered(part);
      const w = walks(order);
      const dayMin = dayMinOf(part);
      return {
        points: order,
        avgWalkMin: Math.round(w.reduce((s, m) => s + m, 0) / w.length),
        dayMin,
        tooLong: dayMin > MAX_DAY_MIN,
        center: {
          lat: part.reduce((s, p) => s + p.lat, 0) / part.length,
          lng: part.reduce((s, p) => s + p.lng, 0) / part.length,
        },
      };
    })
    .sort((x, y) => y.points.length - x.points.length || x.points[0].id.localeCompare(y.points[0].id));

  const loose: LoosePlace[] = parts
    .filter((part) => part.length === 1)
    .map(([point]) => {
      let nearest: MapPoint | null = null;
      let best = FAR_KM;
      for (const p of points) {
        const d = haversineKm(point, p);
        if (p !== point && d <= best) [best, nearest] = [d, p];
      }
      const gi = nearest ? groups.findIndex((g) => g.points.includes(nearest!)) : -1;
      return {
        point,
        nearestPlace: nearest,
        nearestGroup: gi >= 0 ? gi : null,
        walkMin: nearest ? estimateDirections(point, nearest, "walk").durationMin : null,
      };
    })
    .sort((x, y) => x.point.id.localeCompare(y.point.id));

  return { groups, loose };
}
