export type Continent =
  | "asia"
  | "europe"
  | "north-america"
  | "south-america"
  | "africa"
  | "oceania"
  | "middle-east";

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  continent: string | null;
  country: string | null;
  region: string | null;
  start_date: string | null;
  end_date: string | null;
  base_currency: string; // 현지 화폐 코드 (예: JPY)
  cover_image_url: string | null;
  created_at: string;
  /** 공유 토큰: 관리자 응답에만 포함 */
  edit_token?: string;
  view_token?: string;
  /** GET /api/trips/[id] 응답에 붙는 요청자 권한 */
  access?: Access;
}

/** admin: 비밀번호 로그인, edit: 편집 링크, view: 보기 링크 */
export type Access = "admin" | "edit" | "view";

/** 언젠가 가고 싶은 곳 (날짜 없음) */
export interface WishlistPlace {
  id: string;
  name: string;
  continent: string | null;
  country: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  memo: string | null;
  tags: string[];
  /** 1 언젠가 · 2 가고 싶어 · 3 꼭 갈 거야 */
  priority: number;
  /** 여행으로 전환된 경우 연결된 여행 */
  trip_id: string | null;
  created_at: string;
}

/** 지도에 찍는 포인트 (관광지, 식당, 숙소 등) */
export interface MapPoint {
  id: string;
  trip_id: string;
  name: string;
  category:
    | "attraction"
    | "food"
    | "stay"
    | "transport"
    | "shopping"
    | "nature"
    | "culture"
    | "etc";
  memo: string | null;
  lat: number;
  lng: number;
  day_number: number | null; // 어느 Day에 속하는지
  visit_order: number | null; // 그 Day 안에서의 방문 순서
  /** 예약·후기·공식 사이트 등 참고 링크 */
  link_url?: string | null;
  created_at: string;
}

/** 장소 사진 (본문은 /api/point-photos/[id]) */
export interface PointPhoto {
  id: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

/** 포인트 간 이동 구간 */
export interface RouteLeg {
  id: string;
  trip_id: string;
  from_point_id: string;
  to_point_id: string;
  method: "walk" | "transit" | "taxi" | "rental-car" | "bike" | "plane" | "ferry";
  duration_min: number | null; // 예상 이동시간(분)
  distance_km: number | null;
  cost: number | null;
  created_at: string;
}

/** 가계부 항목 */
export interface Expense {
  id: string;
  trip_id: string;
  point_id: string | null;
  day_number: number | null;
  category: "food" | "shopping" | "transport" | "stay" | "activity" | "flight" | "etc";
  title: string;
  amount_local: number; // 현지 화폐 금액
  currency_code: string; // 기재 당시 환율 스냅샷
  exchange_rate_krw: number; // 1 단위당 원화
  amount_krw: number;
  spent_at: string | null;
  created_at: string;
}

/** 준비물 체크리스트 */
export interface ChecklistItem {
  id: string;
  trip_id: string;
  label: string;
  category: string; // docs | electronics | clothes | toiletries | etc
  is_checked: boolean;
  sort_order: number;
}

/** 예매권/문서 (비행기표, 숙박권, 여권 등) */
export interface TravelDoc {
  id: string;
  trip_id: string;
  type: "passport" | "visa" | "flight" | "hotel" | "ticket" | "insurance" | "etc";
  title: string;
  provider: string | null; // 예: 대한항공, 아고다
  confirmation_code: string | null;
  url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  file_path: string | null; // Supabase Storage 경로
}
