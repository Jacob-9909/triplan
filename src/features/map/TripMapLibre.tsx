"use client";

import { useEffect, useState } from "react";
import Map, { Marker, NavigationControl, Popup, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import TripMapCore from "./TripMapCore";
import type { TripMapCoreProps } from "./TripMapCore";
import { adaptKitComponent, type MapKit } from "./mapKit";
import { TRIPOI_LAYER_IDS, TRIPOI_LAYER_PREFIX } from "./poiLayers";

/**
 * 기본 지도: OpenFreeMap Liberty (키·사용량 제한 없음, OpenMapTiles 스키마).
 * OSM 기본 지도처럼 식당·카페·명소·박물관·교회·역 같은 POI 아이콘이 스타일에 들어 있다.
 */
export const OPENFREEMAP_LIBERTY_STYLE = "https://tiles.openfreemap.org/styles/liberty";
/** Liberty에서 장소 아이콘을 그리는 레이어 (클릭 시 장소 이름 자동 입력에 사용) */
const LIBERTY_POI_LAYER_IDS = ["poi_r1", "poi_r7", "poi_r20"];

/** 예비 지도: Carto Voyager (POI가 적어 라벨 레이어를 보강해서 쓴다) */
export const MAPLIBRE_VOYAGER_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

/** 지명을 한국어 이름이 있으면 한국어로, 없으면 현지 이름으로 표시 */
const KOREAN_NAME = ["coalesce", ["get", "name:ko"], ["get", "name"]];

function localizeToKorean(style: Record<string, unknown>): Record<string, unknown> {
  const layers = (style.layers as Array<Record<string, unknown>>).map((layer) => {
    const layout = layer.layout as Record<string, unknown> | undefined;
    const field = layout?.["text-field"];
    // 도로 번호·번지 등 이름이 아닌 라벨은 그대로 둔다
    if (!field || !JSON.stringify(field).includes('"name')) return layer;
    return { ...layer, layout: { ...layout, "text-field": KOREAN_NAME } };
  });
  return { ...style, layers };
}

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
interface PoiSchema {
  /** 벡터 타일 소스 id */
  source: string;
  /** POI가 들어 있는 소스 레이어 */
  sourceLayer: string;
  /** 장소 종류가 담긴 속성 이름 */
  kindProp: string;
  font: unknown;
}

/**
 * Carto는 Voyager 타일을 OpenMapTiles(source "carto", poi.class)에서
 * Protomaps(source "protomaps", pois.kind)로 바꿨다. 스타일을 보고 맞는 스키마를 고른다.
 */
function detectPoiSchema(style: Record<string, unknown>): PoiSchema | null {
  const sources = Object.keys((style.sources as Record<string, unknown>) ?? {});
  const layers = (style.layers as Array<Record<string, unknown>>) ?? [];
  const poiLayer = layers.find((l) => l["source-layer"] === "pois" || l["source-layer"] === "poi");
  const font = (poiLayer?.layout as Record<string, unknown> | undefined)?.["text-font"] ?? VOYAGER_TEXT_FONT;
  if (sources.includes("protomaps")) return { source: "protomaps", sourceLayer: "pois", kindProp: "kind", font };
  if (sources.includes("carto")) return { source: "carto", sourceLayer: "poi", kindProp: "class", font };
  return null;
}

function poiLabelLayer(
  schema: PoiSchema,
  id: string,
  classes: string[],
  color: string,
  minzoom: number
): Record<string, unknown> {
  return {
    id,
    type: "symbol",
    source: schema.source,
    "source-layer": schema.sourceLayer,
    minzoom,
    filter: ["all", ["has", "name"], ["match", ["get", schema.kindProp], classes, true, false]],
    layout: {
      "text-field": "{name}",
      "text-font": schema.font,
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

interface LoadedStyle {
  style: Record<string, unknown>;
  poiLayerIds: string[];
}

let stylePromise: Promise<LoadedStyle> | null = null;
function getStyle(): Promise<LoadedStyle> {
  if (!stylePromise) {
    stylePromise = fetch(OPENFREEMAP_LIBERTY_STYLE)
      .then((res) => {
        if (!res.ok) throw new Error(`openfreemap ${res.status}`);
        return res.json();
      })
      .then((style: Record<string, unknown>) => ({
        style: localizeToKorean(style),
        poiLayerIds: LIBERTY_POI_LAYER_IDS,
      }))
      // OpenFreeMap이 응답하지 않으면 Carto 지도로 대체
      .catch(() => getEnrichedVoyager().then((style) => ({ style, poiLayerIds: TRIPOI_LAYER_IDS })));
  }
  return stylePromise;
}

function getEnrichedVoyager(): Promise<Record<string, unknown>> {
  return fetch(MAPLIBRE_VOYAGER_STYLE)
      .then((res) => res.json())
      .then((style: Record<string, unknown>) => {
        const schema = detectPoiSchema(style);
        // 모르는 스키마면 보강 없이 원본 스타일을 쓴다 (지도 자체는 정상 표시)
        if (!schema) return style;
        const layers = [
          poiLabelLayer(
            schema,
            `${TRIPOI_LAYER_PREFIX}attraction`,
            ["attraction", "museum", "theatre", "monument", "zoo", "aquarium", "theme_park", "viewpoint", "gallery"],
            "#8b5cf6",
            13
          ),
          poiLabelLayer(
            schema,
            `${TRIPOI_LAYER_PREFIX}food`,
            ["restaurant", "cafe", "fast_food", "bar", "pub", "ice_cream", "bakery"],
            "#fb7185",
            14
          ),
        ];
        return { ...style, layers: [...(style.layers as unknown[]), ...layers] };
      });
}

const kit: MapKit = {
  Map: adaptKitComponent(Map),
  Marker: adaptKitComponent(Marker),
  Popup: adaptKitComponent(Popup),
  NavigationControl: adaptKitComponent(NavigationControl),
  Source: adaptKitComponent(Source),
  Layer: adaptKitComponent(Layer),
};

/** 기본 실행 모드 — 토큰 없이 maplibre + OpenFreeMap Liberty(실패 시 Carto) 스타일로 렌더링 */
export default function TripMapLibre(props: Omit<TripMapCoreProps, "kit" | "mapStyle" | "accessToken">) {
  const [loaded, setLoaded] = useState<LoadedStyle | null>(null);

  useEffect(() => {
    let alive = true;
    getStyle().then((s) => {
      if (alive) setLoaded(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!loaded) return null; // 로딩 중 오버레이는 TripMapCore 상위에서 표시됨

  return <TripMapCore {...props} kit={kit} mapStyle={loaded.style} poiLayerIds={loaded.poiLayerIds} />;
}
