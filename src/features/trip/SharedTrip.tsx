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
  canCopy = false,
}: {
  tripId: string;
  token: string;
  mode: "edit" | "view";
  /** 로그인한 관리자·사용 회원이면 "내 여행으로 가져오기" */
  canCopy?: boolean;
}) {
  setTripToken(token);
  // 보기 링크면 그 토큰으로 캘린더 구독을 줄 수 있다 (편집 토큰은 캘린더 주소에 넣지 않는다)
  return <TripWorkspace tripId={tripId} mode={mode} viewToken={mode === "view" ? token : undefined} canCopy={canCopy} />;
}
