import type { CSSProperties, ComponentType, ReactNode, Ref } from "react";

/**
 * 지도 엔진(maplibre-gl / mapbox-gl)을 동일 인터페이스로 추상화.
 * 각 엔진 래퍼(TripMapLibre / TripMapMapbox)에서 실제 컴포넌트를 주입한다.
 */

/** flyTo/getZoom만 사용하는 최소 지도 ref 시그니처 */
export interface MapCameraRef {
  flyTo(options: { center: [number, number]; zoom?: number; duration?: number }): void;
  getZoom(): number;
  /** 핀 전체가 보이도록 화면 맞춤 */
  fitBounds?(
    bounds: [[number, number], [number, number]],
    options?: { padding?: number; maxZoom?: number; duration?: number }
  ): void;
  /** 클릭 좌표의 렌더링된 피처 조회 (POI 클릭 감지용) */
  queryRenderedFeatures?(
    point: [number, number],
    options?: { layers?: string[] }
  ): Array<{
    layer?: { id?: string };
    properties?: Record<string, unknown>;
    geometry?: { coordinates: [number, number] };
  }>;
}

export interface MapClickEvent {
  lngLat: { lat: number; lng: number };
  point?: { x: number; y: number };
}

export interface KitMapProps {
  ref?: Ref<MapCameraRef>;
  mapStyle?: string | Record<string, unknown>;
  mapboxAccessToken?: string;
  initialViewState?: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  style?: CSSProperties;
  cursor?: string;
  onClick?: (e: MapClickEvent) => void;
  onLoad?: () => void;
  onError?: (e: { error?: { message?: string } }) => void;
  children?: ReactNode;
}

export interface KitMarkerProps {
  latitude: number;
  longitude: number;
  anchor?: string;
  offset?: [number, number];
  rotationAlignment?: string;
  children?: ReactNode;
}

export interface KitPopupProps {
  latitude: number;
  longitude: number;
  anchor?: string;
  offset?: [number, number];
  closeButton?: boolean;
  closeOnClick?: boolean;
  maxWidth?: string;
  children?: ReactNode;
}

export interface KitNavigationControlProps {
  position?: string;
  showCompass?: boolean;
}

export interface KitSourceProps {
  id: string;
  type: string;
  data: unknown;
  children?: ReactNode;
}

export interface KitLayerProps {
  id?: string;
  type?: string;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
}

export interface MapKit {
  Map: ComponentType<KitMapProps>;
  Marker: ComponentType<KitMarkerProps>;
  Popup: ComponentType<KitPopupProps>;
  NavigationControl: ComponentType<KitNavigationControlProps>;
  Source: ComponentType<KitSourceProps>;
  Layer: ComponentType<KitLayerProps>;
}

/**
 * 엔진별(react-map-gl/maplibre, react-map-gl/mapbox) 컴포넌트는 구조적으로
 * 동일한 API를 가지므로 MapKit 경계에서만 타입을 변환한다.
 */
export function adaptKitComponent<T>(component: unknown): ComponentType<T> {
  return component as ComponentType<T>;
}
