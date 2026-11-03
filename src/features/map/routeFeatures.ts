import type { MapPoint, RouteLeg, RouteOption, RouteStep } from "@/lib/types";
import { connectors } from "../route/geometry.ts";
import { isStale } from "../route/routeOptions.ts";

type Coords = [number, number][];
type LineFeature<P> = { type: "Feature"; properties: P; geometry: { type: "LineString"; coordinates: Coords } };
type PointFeature<P> = { type: "Feature"; properties: P; geometry: { type: "Point"; coordinates: [number, number] } };
type Collection<F> = { type: "FeatureCollection"; features: F[] };

export type LineKind = "walk" | "vehicle" | "drive" | "bike" | "estimate";

export interface RouteFeatures {
  /** 고른 이동수단의 경로 (단계별로 나뉨) */
  lines: Collection<LineFeature<{ legId: string; color: string; kind: LineKind }>>;
  /** 고른 구간의 다른 이동수단 경로 (흐리게) */
  alternatives: Collection<LineFeature<{ legId: string; method: RouteLeg["method"] }>>;
  /** 타고 내리는 곳 */
  transfers: Collection<PointFeature<{ color: string }>>;
  /** 길에서 떨어진 핀까지 잇는 짧은 선 */
  connectors: Collection<LineFeature<Record<string, never>>>;
}

/** 지도 출처 표기. 처음부터 고정해 둔다 (geojson 소스의 attribution 은 나중에 바꿔도 갱신되지 않는다) */
export const ROUTE_ATTRIBUTION =
  'Routes © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · FOSSGIS Valhalla (<a href="https://www.openstreetmap.org/fixthemap">improve this map</a>) · Transit powered by <a href="https://www.odsay.com">www.ODsay.com</a>';

/** 지도를 누른 곳의 피처(맨 위부터)에서, 맨 위가 흐린 대안 경로일 때만 그 구간·이동수단 */
export function altFromHits(
  hits: { layer?: { id?: string }; properties?: Record<string, unknown> }[]
): { legId: string; method: RouteLeg["method"] } | null {
  const top = hits[0];
  if (top?.layer?.id !== "route-alt" || typeof top.properties?.legId !== "string") return null;
  return { legId: top.properties.legId, method: top.properties.method as RouteLeg["method"] };
}

export const ROUTE_COLORS = {
  walk: "#7a8597",
  drive: "#2f6fdf",
  bike: "#2a9d6a",
  estimate: "#8a94a6",
  alternative: "#c3c9d2",
} as const;
const VEHICLE_DEFAULT: Record<RouteStep["mode"], string> = {
  walk: ROUTE_COLORS.walk,
  subway: "#2f6fdf",
  bus: "#3d7be0",
  rail: "#6b5bd6",
  other: "#6b7280",
};

const line = <P>(properties: P, coordinates: Coords): LineFeature<P> => ({
  type: "Feature",
  properties,
  geometry: { type: "LineString", coordinates },
});
const collection = <F>(features: F[]): Collection<F> => ({ type: "FeatureCollection", features });

function kindOf(method: RouteLeg["method"]): LineKind {
  if (method === "walk") return "walk";
  if (method === "bike") return "bike";
  return "drive";
}

/** 구간마다 고른 이동수단의 실제 경로(없거나 낡았으면 추정 직선)와, 고른 구간의 대안 경로 */
export function buildRouteFeatures(
  points: MapPoint[],
  legs: RouteLeg[],
  options: RouteOption[],
  selectedLegId: string | null
): RouteFeatures {
  const byId = new Map(points.map((p) => [p.id, p]));
  const lines: RouteFeatures["lines"]["features"] = [];
  const alternatives: RouteFeatures["alternatives"]["features"] = [];
  const transfers: RouteFeatures["transfers"]["features"] = [];
  const joins: RouteFeatures["connectors"]["features"] = [];

  for (const leg of legs) {
    const from = byId.get(leg.from_point_id);
    const to = byId.get(leg.to_point_id);
    if (!from || !to) continue;
    const fresh = options.filter((o) => o.leg_id === leg.id && o.shape.length >= 2 && !isStale(o, from, to));
    const chosen = fresh.find((o) => o.method === leg.method);

    if (!chosen) {
      lines.push(line({ legId: leg.id, color: ROUTE_COLORS.estimate, kind: "estimate" as const }, [[from.lng, from.lat], [to.lng, to.lat]]));
    } else if (chosen.steps?.length) {
      for (const step of chosen.steps) {
        if (step.shape.length < 2) continue;
        const walk = step.mode === "walk";
        const color = walk ? ROUTE_COLORS.walk : (step.color ?? VEHICLE_DEFAULT[step.mode]);
        lines.push(line({ legId: leg.id, color, kind: walk ? ("walk" as const) : ("vehicle" as const) }, step.shape));
        if (!walk) {
          for (const c of [step.shape[0], step.shape[step.shape.length - 1]]) {
            transfers.push({ type: "Feature", properties: { color }, geometry: { type: "Point", coordinates: c } });
          }
        }
      }
    } else {
      const kind = kindOf(chosen.method);
      const color = kind === "walk" ? ROUTE_COLORS.walk : kind === "bike" ? ROUTE_COLORS.bike : ROUTE_COLORS.drive;
      lines.push(line({ legId: leg.id, color, kind }, chosen.shape));
    }
    if (chosen) for (const c of connectors(chosen.shape, from, to)) joins.push(line({}, c));

    if (leg.id === selectedLegId) {
      for (const alt of fresh) if (alt.method !== leg.method) alternatives.push(line({ legId: leg.id, method: alt.method }, alt.shape));
    }
  }
  return { lines: collection(lines), alternatives: collection(alternatives), transfers: collection(transfers), connectors: collection(joins) };
}
