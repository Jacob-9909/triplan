"use client";

import dynamic from "next/dynamic";
import type { Expense, MapPoint, RouteLeg } from "@/lib/types";
import type { PointDraft } from "./AddPointDialog";

export interface TripMapProps {
  points: MapPoint[];
  /** 경로선 그리기용 이동 구간 */
  legs?: RouteLeg[];
  /** 포인트에 연결된 지출 (팝업 정보 카드용) */
  expenses?: Expense[];
  selectedPointId?: string | null;
  /** 변경되면 해당 핀으로 flyTo */
  focusPointId?: string | null;
  /** 지도 빈 곳 클릭 시 latlng 콜백 */
  onMapClick?: (
    latlng: { lat: number; lng: number },
    poi?: { name: string; category: MapPoint["category"] }
  ) => void;
  onPointClick?: (id: string) => void;
  /** true면 지도 클릭으로 포인트 추가 플로우 시작 */
  editable?: boolean;
  /** AddPointDialog에서 저장 시 호출 (editable일 때만 동작) */
  onPointCreate?: (draft: PointDraft) => void;
  /** 포인트가 없을 때 사용할 기본 중심 좌표 (여행 국가) */
  defaultCenter?: { lat: number; lng: number; zoom?: number } | null;
}

const loading = () => (
  <div className="card flex h-full min-h-[320px] items-center justify-center">
    <p className="animate-pulse text-sm font-semibold text-foreground/50">지도를 불러오는 중…</p>
  </div>
);

/**
 * 토큰이 있으면 mapbox 클라우드 모드(outdoors-v12), 없으면
 * maplibre + 무료 Carto Voyager 스타일로 렌더링 — 토큰 없이도 정상 동작.
 * env는 빌드 타임에 인라인되므로 분기가 안전하다.
 */
const TripMapImpl = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  ? dynamic(() => import("./TripMapMapbox"), { ssr: false, loading })
  : dynamic(() => import("./TripMapLibre"), { ssr: false, loading });

export default function TripMapClient(props: TripMapProps) {
  return <TripMapImpl {...props} />;
}
