"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Expense, MapPoint, RouteLeg } from "@/lib/types";
import PinMarker from "./PinMarker";
import RouteLine from "./RouteLine";
import { getCategoryLabel } from "./categories";
import { pointColor } from "./pointStyle";
import { sortPointsByOrder } from "./sort";
import { poiCategoryGuess, TRIPOI_LAYER_IDS } from "./poiLayers";
import type { MapCameraRef, MapClickEvent, MapKit } from "./mapKit";

export interface TripMapCoreProps {
  points: MapPoint[];
  /** 경로선 그리기용 이동 구간 */
  legs?: RouteLeg[];
  /** 포인트에 연결된 지출 (팝업 정보 카드에 합계 표시용) */
  expenses?: Expense[];
  selectedPointId?: string | null;
  /** 변경되면 해당 핀으로 flyTo */
  focusPointId?: string | null;
  /** 지도 빈 곳 클릭 시 latlng 콜백. editable일 때 POI 라벨을 누르면 두 번째 인자로 장소 정보가 전달된다 */
  onMapClick?: (
    latlng: { lat: number; lng: number },
    poi?: { name: string; category: MapPoint["category"] }
  ) => void;
  onPointClick?: (id: string) => void;
  /** 팝업의 자세히 버튼: 장소 상세(사진·링크·메모) 열기 */
  onPointOpen?: (id: string) => void;
  /** true면 지도 클릭으로 포인트 추가 플로우 시작 */
  editable?: boolean;
  /** 엔진별 지도 컴포넌트 세트 */
  kit: MapKit;
  /** <Map>에 전달할 스타일 (URL 또는 스타일 객체) */
  mapStyle: string | Record<string, unknown>;
  /** 포인트가 없을 때 사용할 기본 중심 좌표 (여행 국가) */
  defaultCenter?: { lat: number; lng: number; zoom?: number } | null;
  /** false면 핀 사이 경로선을 그리지 않는다 (위시리스트 지도) */
  showRoute?: boolean;
  /** false면 핀 위 순번을 숨긴다 */
  numbered?: boolean;
  /** 지도 높이 클래스 덮어쓰기 */
  heightClass?: string;
  /** 클릭 시 장소 정보를 읽어 올 POI 레이어 (지도 스타일마다 다름) */
  poiLayerIds?: string[];
  /** mapbox 클라우드 모드에서만 사용하는 액세스 토큰 */
  accessToken?: string;
}

const DEFAULT_VIEW = { latitude: 20, longitude: 0, zoom: 2 };

export default function TripMapCore({
  points,
  legs = [],
  expenses = [],
  selectedPointId = null,
  focusPointId = null,
  onMapClick,
  onPointClick,
  onPointOpen,
  editable = false,
  kit,
  mapStyle,
  accessToken,
  defaultCenter = null,
  showRoute = true,
  numbered = true,
  heightClass = "h-[380px] sm:h-[440px] lg:h-[520px]",
  poiLayerIds = TRIPOI_LAYER_IDS,
}: TripMapCoreProps) {
  const { Map, Marker, Popup, NavigationControl } = kit;
  const mapRef = useRef<MapCameraRef>(null);
  const [popupId, setPopupId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const sortedPoints = useMemo(() => sortPointsByOrder(points), [points]);
  const popupPoint = useMemo(() => points.find((p) => p.id === popupId) ?? null, [points, popupId]);
  const popupExpenseTotal = useMemo(
    () =>
      popupPoint
        ? expenses
            .filter((e) => e.point_id === popupPoint.id)
            .reduce((sum, e) => sum + e.amount_krw, 0)
        : 0,
    [expenses, popupPoint]
  );

  useEffect(() => {
    if (!focusPointId || !mapRef.current) return;
    const target = points.find((p) => p.id === focusPointId);
    if (!target) return;
    mapRef.current.flyTo({ center: [target.lng, target.lat], zoom: Math.max(mapRef.current.getZoom(), 14), duration: 900 });
  }, [focusPointId, points]);

  // 핀 구성이 바뀌면(Day 전환 등) 전체 핀이 보이게 화면을 맞춘다
  const pointsKey = sortedPoints.map((p) => p.id).join(",");
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || sortedPoints.length === 0) return;
    if (sortedPoints.length === 1) {
      const p = sortedPoints[0];
      map.flyTo({ center: [p.lng, p.lat], zoom: showRoute ? 13 : 3, duration: 600 });
      return;
    }
    const lngs = sortedPoints.map((p) => p.lng);
    const lats = sortedPoints.map((p) => p.lat);
    map.fitBounds?.(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: showRoute ? 70 : 60, maxZoom: showRoute ? 15 : 4, duration: 600 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 핀 id 구성이 바뀔 때만 맞춤
  }, [mapReady, pointsKey, showRoute]);

  // 개발 환경 CDP 검증용
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __tripMap?: MapCameraRef | null }).__tripMap = mapRef.current;
    }
  }, [mapReady]);

  const handleMapClick = useCallback(
    (e: MapClickEvent) => {
      const latlng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      setPopupId(null);
      if (!editable) {
        onMapClick?.(latlng);
        return;
      }

      // POI 라벨(식당·명소)을 클릭했다면 그 장소 정보를 미리 채워 핀 추가 시작
      const poi = mapRef.current
        ?.queryRenderedFeatures?.(
          e.point ? [e.point.x, e.point.y] : [0, 0],
          { layers: poiLayerIds }
        )
        ?.find((f) => typeof f.properties?.name === "string" && (f.properties!.name as string).length > 0);
      if (poi) {
        const props = poi.properties!;
        const [lng, lat] = poi.geometry?.coordinates ?? [latlng.lng, latlng.lat];
        // 지도에 보이는 것과 같은 이름(한국어가 있으면 한국어)으로 채운다
        const name = (props["name:ko"] as string | undefined) ?? (props.name as string);
        onMapClick?.({ lat, lng }, { name, category: poiCategoryGuess(props.class ?? props.kind) });
        return;
      }

      onMapClick?.(latlng);
    },
    [editable, onMapClick, poiLayerIds]
  );

  return (
    <div className={`relative w-full overflow-hidden rounded-[var(--radius-card)] ${heightClass}`}>
      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        mapboxAccessToken={accessToken}
        initialViewState={{
          ...DEFAULT_VIEW,
          ...(!showRoute
            ? { latitude: 25, longitude: 110, zoom: 1.4 }
            : sortedPoints.length > 0
            ? { latitude: sortedPoints[0].lat, longitude: sortedPoints[0].lng }
            : defaultCenter
              ? { latitude: defaultCenter.lat, longitude: defaultCenter.lng, zoom: defaultCenter.zoom ?? DEFAULT_VIEW.zoom }
              : {}),
        }}
        style={{ width: "100%", height: "100%" }}
        cursor={editable ? "crosshair" : "grab"}
        onClick={handleMapClick}
        onLoad={() => setMapReady(true)}
        onError={(e: { error?: { message?: string } }) =>
          setMapError(e?.error?.message ?? "지도를 불러오지 못했어요")
        }
      >
        <NavigationControl position="top-right" showCompass={false} />

        {showRoute && <RouteLine points={sortedPoints} kit={kit} />}

        {sortedPoints.map((point, i) => (
          <Marker key={point.id} latitude={point.lat} longitude={point.lng} anchor="bottom" offset={[0, 6]}>
            <div className="pin-drop flex cursor-pointer flex-col items-center gap-1" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
              <PinMarker
                category={point.category}
                color={point.color}
                label={numbered ? i + 1 : undefined}
                selected={point.id === selectedPointId}
                onClick={() => {
                  setPopupId(point.id);
                  onPointClick?.(point.id);
                }}
              />
              {/* 항상 보이는 이름 라벨 — 클릭하면 상세 정보 팝업 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPopupId(point.id);
                  onPointClick?.(point.id);
                }}
                className={`max-w-28 truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm transition-colors ${
                  point.id === selectedPointId
                    ? "border-primary bg-primary text-white"
                    : "border-border-subtle bg-white/95 text-foreground/80 hover:border-primary hover:text-primary-strong"
                }`}
              >
                {point.name}
              </button>
            </div>
          </Marker>
        ))}

        {popupPoint && (
          <Popup
            latitude={popupPoint.lat}
            longitude={popupPoint.lng}
            anchor="bottom"
            offset={[0, -54]}
            closeButton={false}
            closeOnClick={false}
            maxWidth="280px"
          >
            <div className="w-[248px]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  {numbered && (
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: pointColor(popupPoint) }}
                    >
                      {sortedPoints.findIndex((p) => p.id === popupPoint.id) + 1}
                    </span>
                  )}
                  <p className="truncate text-sm font-bold leading-snug">{popupPoint.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPopupId(null)}
                  aria-label="닫기"
                  className="-mr-1 -mt-0.5 shrink-0 rounded-full p-1 text-foreground/55 hover:bg-surface-muted hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">

                <span
                  className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  style={{ borderColor: pointColor(popupPoint), color: pointColor(popupPoint) }}
                >
                  {getCategoryLabel(popupPoint.category)}
                </span>
                {popupPoint.day_number != null && (
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary-strong">
                    Day {popupPoint.day_number}
                  </span>
                )}
                {popupExpenseTotal > 0 && (
                  <span className="text-[11px] font-semibold text-foreground/72">지출 {popupExpenseTotal.toLocaleString()}원</span>
                )}
              </div>
              {popupPoint.memo && (
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-foreground/72">{popupPoint.memo}</p>
              )}
              {onPointOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setPopupId(null);
                    onPointOpen(popupPoint.id);
                  }}
                  className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-full bg-primary-soft py-1.5 text-xs font-bold text-primary-strong transition hover:bg-primary hover:text-white"
                >
                  사진·링크·메모 보기
                </button>
              )}
              <div className="mt-2.5 flex items-center gap-3 border-t border-border-subtle pt-2 text-[11px] font-semibold text-primary-strong">
                <a
                  href={`https://map.naver.com/p/search/${encodeURIComponent(popupPoint.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline"
                >
                  네이버지도
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${popupPoint.name} ${popupPoint.lat},${popupPoint.lng}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline"
                >
                  구글지도
                </a>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* 지도 로딩/에러 상태 오버레이 */}
      {(mapError || !mapReady) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-surface-muted/80 text-sm text-foreground/72">
          {mapError ? (
            <>
              <span className="font-semibold text-accent">지도를 표시할 수 없어요</span>
              <span className="max-w-xs break-words text-center text-xs">{mapError}</span>
            </>
          ) : (
            <span>지도를 불러오는 중…</span>
          )}
        </div>
      )}
    </div>
  );
}
