"use client";

import { useEffect, useState } from "react";
import Map, { Marker, NavigationControl, Popup, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import TripMapCore from "./TripMapCore";
import type { TripMapCoreProps } from "./TripMapCore";
import { adaptKitComponent, type MapKit } from "./mapKit";
import { TRIPOI_LAYER_PREFIX } from "./poiLayers";

/** 토큰 없이 동작하는 무료 밝은 스타일 (Carto Voyager — OSM 데이터 기반) */
export const MAPLIBRE_VOYAGER_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const VOYAGER_TEXT_FONT = [
  "Montserrat Medium",
  "Open Sans Bold",
  "Noto Sans Regular",
  "HanWangHeiLight Regular",
  "NanumBarunGothic Regular",
];

/**
 * Voyager 스타일에는 식당·명소 POI가 빠져 있으므로(경기장/공원뿐),
 * 같은 carto 벡터 타일의 poi 소스 레이어를 재사용해 라벨 레이어를 추가한다.
 */
function poiLabelLayer(
  id: string,
  classes: string[],
  color: string,
  minzoom: number
): Record<string, unknown> {
  return {
    id,
    type: "symbol",
    source: "carto",
    "source-layer": "poi",
    minzoom,
    filter: ["all", ["has", "name"], ["match", ["get", "class"], classes, true, false]],
    layout: {
      "text-field": "{name}",
      "text-font": VOYAGER_TEXT_FONT,
      "text-size": { stops: [[13, 9], [16, 11], [18, 12]] },
      "text-anchor": "top",
      "text-offset": [0, 0.6],
      "text-keep-upright": true,
      "text-max-width": 8,
    },
    paint: {
      "text-color": color,
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.4,
    },
  };
}

let enrichedStylePromise: Promise<Record<string, unknown>> | null = null;
function getEnrichedStyle(): Promise<Record<string, unknown>> {
  if (!enrichedStylePromise) {
    enrichedStylePromise = fetch(MAPLIBRE_VOYAGER_STYLE)
      .then((res) => res.json())
      .then((style: Record<string, unknown>) => {
        const layers = [
          poiLabelLayer(
            `${TRIPOI_LAYER_PREFIX}attraction`,
            ["attraction", "museum", "theatre", "monument", "zoo", "aquarium", "theme_park", "viewpoint", "gallery"],
            "#8b5cf6",
            13
          ),
          poiLabelLayer(
            `${TRIPOI_LAYER_PREFIX}food`,
            ["restaurant", "cafe", "fast_food", "bar", "pub", "ice_cream", "bakery"],
            "#fb7185",
            14
          ),
        ];
        return { ...style, layers: [...(style.layers as unknown[]), ...layers] };
      });
  }
  return enrichedStylePromise;
}

const kit: MapKit = {
  Map: adaptKitComponent(Map),
  Marker: adaptKitComponent(Marker),
  Popup: adaptKitComponent(Popup),
  NavigationControl: adaptKitComponent(NavigationControl),
  Source: adaptKitComponent(Source),
  Layer: adaptKitComponent(Layer),
};

/** 기본 실행 모드 — 토큰 없이 maplibre + Carto Voyager(POI 보강) 스타일로 렌더링 */
export default function TripMapLibre(props: Omit<TripMapCoreProps, "kit" | "mapStyle" | "accessToken">) {
  const [styleObj, setStyleObj] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let alive = true;
    getEnrichedStyle().then((s) => {
      if (alive) setStyleObj(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!styleObj) return null; // 로딩 중 오버레이는 TripMapCore 상위에서 표시됨

  return <TripMapCore {...props} kit={kit} mapStyle={styleObj} />;
}
