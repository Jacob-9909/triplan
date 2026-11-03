"use client";

import { useMemo } from "react";
import type { ComponentType, ReactNode } from "react";
import type { MapPoint, RouteLeg, RouteOption } from "@/lib/types";
import type { KitLayerProps } from "./mapKit";
import { buildRouteFeatures, ROUTE_ATTRIBUTION, ROUTE_COLORS } from "./routeFeatures";

export interface RouteLineKit {
  Source: ComponentType<{ id: string; type: string; data: unknown; attribution?: string; children?: ReactNode }>;
  Layer: ComponentType<KitLayerProps>;
}

/** 선 안에 들어가는 방향 화살표 이미지 이름 (TripMapCore 가 지도에 등록) */
export const ROUTE_ARROW_IMAGE = "route-arrow";
/** 흐린 대안 경로 레이어 (눌러서 이동수단 바꾸기) */
export const ROUTE_ALT_LAYER = "route-alt";

const ROUND = { "line-cap": "round", "line-join": "round" };

/**
 * 구간 경로: 고른 이동수단의 실제 길(대중교통은 걷기·노선 색으로 나눔)과 선 안 화살표.
 * 경로가 없는 구간은 점선 직선(추정). 고른 구간은 다른 이동수단 경로를 흐리게 깐다.
 */
export default function RouteLine({
  points,
  legs,
  options,
  selectedLegId,
  kit,
}: {
  points: MapPoint[];
  legs: RouteLeg[];
  options: RouteOption[];
  selectedLegId: string | null;
  kit: RouteLineKit;
}) {
  const { Source, Layer } = kit;
  const f = useMemo(() => buildRouteFeatures(points, legs, options, selectedLegId), [points, legs, options, selectedLegId]);

  return (
    <>
      <Source id="route-alts" type="geojson" data={f.alternatives}>
        <Layer
          id={ROUTE_ALT_LAYER}
          type="line"
          layout={ROUND}
          paint={{ "line-color": ROUTE_COLORS.alternative, "line-width": 7, "line-opacity": 0.75 }}
        />
      </Source>
      <Source id="route-joins" type="geojson" data={f.connectors}>
        <Layer
          id="route-join"
          type="line"
          layout={ROUND}
          paint={{ "line-color": ROUTE_COLORS.walk, "line-width": 3, "line-dasharray": [0.2, 2] }}
        />
      </Source>
      <Source
        id="trip-route"
        type="geojson"
        data={f.lines}
        attribution={ROUTE_ATTRIBUTION}
      >
        <Layer id="route-casing" type="line" layout={ROUND} paint={{ "line-color": "#ffffff", "line-width": 12, "line-opacity": 0.95 }} />
        <Layer
          id="route-line"
          type="line"
          filter={["!=", ["get", "kind"], "estimate"]}
          layout={ROUND}
          paint={{ "line-color": ["get", "color"], "line-width": 8 }}
        />
        <Layer
          id="route-estimate"
          type="line"
          filter={["==", ["get", "kind"], "estimate"]}
          layout={ROUND}
          paint={{ "line-color": ["get", "color"], "line-width": 5, "line-dasharray": [1.5, 1.5] }}
        />
        <Layer
          id="route-arrows"
          type="symbol"
          layout={{
            "symbol-placement": "line",
            "symbol-spacing": 60,
            "icon-image": ROUTE_ARROW_IMAGE,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-rotation-alignment": "map",
            "icon-keep-upright": false,
          }}
        />
      </Source>
      <Source id="route-transfers" type="geojson" data={f.transfers}>
        <Layer
          id="route-transfer"
          type="circle"
          paint={{ "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": ["get", "color"], "circle-stroke-width": 3 }}
        />
      </Source>
    </>
  );
}

/** 선 폭(8px) 안에 들어가는 흰 꺾쇠: 2배 해상도(20px = 화면 10px, 높이 6px)로 그린다 */
export function makeArrowImage(): ImageData | null {
  if (typeof document === "undefined") return null;
  const size = 20;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(7, 4);
  ctx.lineTo(13, 10);
  ctx.lineTo(7, 16);
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}
