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

/** 구간 중간 지점 + 진행 방위각 (화살표 마커용) */
export function computeLegArrows(points: MapPoint[], legs: RouteLeg[]): LegArrow[] {
  const byId = new Map(points.map((p) => [p.id, p]));
  const arrows: LegArrow[] = [];
  for (const leg of legs) {
    const from = byId.get(leg.from_point_id);
    const to = byId.get(leg.to_point_id);
    if (!from || !to) continue;
    const midLat = (from.lat + to.lat) / 2;
    const y = Math.sin(((to.lng - from.lng) * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180);
    const x =
      Math.cos((from.lat * Math.PI) / 180) * Math.sin((to.lat * Math.PI) / 180) -
      Math.sin((from.lat * Math.PI) / 180) *
        Math.cos((to.lat * Math.PI) / 180) *
        Math.cos(((to.lng - from.lng) * Math.PI) / 180);
    const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    arrows.push({ lat: midLat, lng: (from.lng + to.lng) / 2, bearing });
  }
  return arrows;
}

const lineCasingLayer: KitLayerProps = {
  id: "route-line-casing",
  type: "line",
  paint: {
    "line-color": "#ffffff",
    "line-width": 7,
    "line-blur": 0.5,
  },
  layout: { "line-cap": "round", "line-join": "round" },
};

const lineLayer: KitLayerProps = {
  id: "route-line",
  type: "line",
  paint: {
    "line-color": "#0284c7", // primary-strong
    "line-width": 4,
    "line-opacity": 0.9,
  },
  layout: { "line-cap": "round", "line-join": "round" },
};

const dashArrowLayer: KitLayerProps = {
  id: "route-line-dash",
  type: "line",
  layout: { "line-cap": "round" },
  paint: {
    "line-color": "#e0f2fe",
    "line-width": 2,
    "line-dasharray": [0, 2.2],
  },
};

function ArrowGlyph({ bearing }: { bearing: number }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ transform: `rotate(${bearing}deg)` }} aria-hidden>
      <path d="M6 3 L18 12 L6 21 L10 12 Z" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
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
 * 인접 포인트 간 이동경로 선 — 굵은 라운드 라인 + 화살표.
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
        <Layer {...dashArrowLayer} />
      </Source>
      {arrows.map((a, i) => (
        <Marker key={`arrow-${i}`} latitude={a.lat} longitude={a.lng} anchor="center" rotationAlignment="viewport">
          <ArrowGlyph bearing={a.bearing} />
        </Marker>
      ))}
    </>
  );
}
