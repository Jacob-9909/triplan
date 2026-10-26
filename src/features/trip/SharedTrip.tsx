"use client";

import { setTripToken } from "@/lib/api";
import TripWorkspace from "./TripWorkspace";

/**
 * 공유 링크 진입점. 하위 컴포넌트가 데이터를 불러오기 전에 토큰을 등록해야 하므로
 * 렌더 단계에서 바로 설정한다 (같은 값이라 반복 호출해도 안전).
 */
export default function SharedTrip({
  tripId,
  token,
  mode,
}: {
  tripId: string;
  token: string;
  mode: "edit" | "view";
}) {
  setTripToken(token);
  return <TripWorkspace tripId={tripId} mode={mode} />;
}
