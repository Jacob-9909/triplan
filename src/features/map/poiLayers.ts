import type { MapPoint } from "@/lib/types";

/** TripMapLibre가 스타일에 추가하는 보강 POI 레이어 접두사 */
export const TRIPOI_LAYER_PREFIX = "tripoi-";

/** POI 클릭 감지에 사용할 레이어 id 목록 */
export const TRIPOI_LAYER_IDS = [`${TRIPOI_LAYER_PREFIX}attraction`, `${TRIPOI_LAYER_PREFIX}food`];

/** OSM poi class → 앱 카테고리 매핑 */
export function poiCategoryGuess(poiClass?: unknown): MapPoint["category"] {
  const c = String(poiClass ?? "");
  if (["restaurant", "cafe", "fast_food", "bar", "pub", "ice_cream", "bakery"].includes(c)) return "food";
  if (["museum", "theatre", "monument", "gallery"].includes(c)) return "culture";
  if (["hotel", "guest_house", "hostel", "motel"].includes(c)) return "stay";
  return "attraction";
}
