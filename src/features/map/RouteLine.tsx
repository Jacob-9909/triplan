"use client";

import { useMemo } from "react";
import type { ComponentType, ReactNode } from "react";
import type { MapPoint, RouteLeg } from "@/lib/types";
import type { KitLayerProps } from "./mapKit";

export interface LegArrow {
  lng: number;
  lat: number;
  bearing: number;
}

type LineFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: Record<string, never>;
    geometry: { type: "LineString"; coordinates: [number, number][] };
  }[];
};

export interface RouteLineKit {
  Source: ComponentType<{
    id: string;
    type: string;
    data: unknown;
    children?: ReactNode;
  }>;
  Layer: ComponentType<KitLayerProps>;
  Marker: ComponentType<{
    latitude: number;
    longitude: number;
    anchor?: string;
    rotationAlignment?: string;
    children?: ReactNode;
  }>;
}

/** legs를 GeoJSON FeatureCollection으로 변환 */
export function buildLegsGeoJSON(points: MapPoint[], legs: RouteLeg[]): LineFeatureCollection {
  const byId = new Map(points.map((p) => [p.id, p]));
  const features = legs
    .map((leg) => {
      const from = byId.get(leg.from_point_id);
      const to = byId.get(leg.to_point_id);
      if (!from || !to) return null;
      return {
        type: "Feature" as const,
        properties: {} as Record<string, never>,
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ] as [number, number][],
        },
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);
  return { type: "FeatureCollection", features };
}

/** 웹 메르카토르 y (화면과 같은 비율로 각도를 재기 위함) */
function mercY(lat: number) {
  const r = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + r / 2));
}

/**
 * 구간마다 화살촉 위치(구간의 62% 지점)와 화면상 회전각.
 * bearing은 오른쪽(동쪽)을 0°로 하는 시계 방향 각도 — 오른쪽을 향한 화살 그림을 그대로 돌리면 된다.
 * 지도를 회전하지 않는 한 확대/축소와 무관하게 맞다.
 */
export function computeLegArrows(points: MapPoint[], legs: RouteLeg[]): LegArrow[] {
  const byId = new Map(points.map((p) => [p.id, p]));
  const arrows: LegArrow[] = [];
  for (const leg of legs) {
    const from = byId.get(leg.from_point_id);
    const to = byId.get(leg.to_point_id);
    if (!from || !to) continue;
    const dx = ((to.lng - from.lng) * Math.PI) / 180;
    const dyNorth = mercY(to.lat) - mercY(from.lat);
    const bearing = (-Math.atan2(dyNorth, dx) * 180) / Math.PI;
    const t = 0.62;
    arrows.push({ lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t, bearing });
  }
  return arrows;
}

/** 경로선: 청록 (지도 위 도로·물 색과 겹치지 않게) */
const ROUTE_COLOR = "#0d6b63";

/** 지도 위에서 묻히지 않게 얇은 흰 테두리 */
const lineCasingLayer: KitLayerProps = {
  id: "route-line-casing",
  type: "line",
  paint: { "line-color": "#ffffff", "line-width": 5, "line-opacity": 0.9 },
  layout: { "line-cap": "round", "line-join": "round" },
};

/** 장소 사이를 잇는 얇은 직선 */
const lineLayer: KitLayerProps = {
  id: "route-line",
  type: "line",
  paint: { "line-color": ROUTE_COLOR, "line-width": 2.5, "line-opacity": 0.85 },
  layout: { "line-cap": "round", "line-join": "round" },
};

/** 진행 방향 화살촉 (오른쪽을 향한 모양, bearing만큼 회전) */
function ArrowGlyph({ bearing }: { bearing: number }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${bearing}deg)`, filter: "drop-shadow(0 1px 2px rgba(13,27,42,0.35))" }}
      aria-hidden
    >
      <path d="M5 4.5 L20 12 L5 19.5 L8.5 12 Z" fill={ROUTE_COLOR} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export interface RouteLineProps {
  points: MapPoint[];
  legs: RouteLeg[];
  /** 엔진별 Source/Layer/Marker 컴포넌트 (maplibre 또는 mapbox) */
  kit: RouteLineKit;
}

/**
 * 인접 포인트 간 이동경로 — 얇은 직선 + 방향 화살촉 (A → B → C 순서가 보이게).
 * DB legs와 무관하게 항상 현재 visit_order 순서대로 포인트를 연결한다
 * (순서를 바꾸면 경로선도 즉시 따라 바뀜).
 */
export default function RouteLine({ points, kit }: Omit<RouteLineProps, "legs">) {
  const { Source, Layer, Marker } = kit;

  const effectiveLegs = useMemo<RouteLeg[]>(() => {
    const sorted = [...points].sort(
      (a, b) =>
        (a.day_number ?? 0) - (b.day_number ?? 0) || (a.visit_order ?? 0) - (b.visit_order ?? 0)
    );
    return sorted.slice(1).map((to, i): RouteLeg => {
      const from = sorted[i];
      return {
        id: `route-${from.id}-${to.id}`,
        trip_id: to.trip_id,
        from_point_id: from.id,
        to_point_id: to.id,
        method: "walk",
        duration_min: null,
        distance_km: null,
        cost: null,
        created_at: "",
      };
    });
  }, [points]);

  const geojson = useMemo(() => buildLegsGeoJSON(points, effectiveLegs), [points, effectiveLegs]);
  const arrows = useMemo(() => computeLegArrows(points, effectiveLegs), [points, effectiveLegs]);

  if (geojson.features.length === 0) return null;

  return (
    <>
      <Source id="trip-route" type="geojson" data={geojson}>
        <Layer {...lineCasingLayer} />
        <Layer {...lineLayer} />
      </Source>
      {arrows.map((a, i) => (
        <Marker key={`arrow-${i}`} latitude={a.lat} longitude={a.lng} anchor="center" rotationAlignment="viewport">
          <ArrowGlyph bearing={a.bearing} />
        </Marker>
      ))}
    </>
  );
}
