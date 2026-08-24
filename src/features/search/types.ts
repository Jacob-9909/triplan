/** 검색 결과가 없을 때 유도하는 외부 예매 딥링크 */
export interface SearchLink {
  provider: string; // "Google Flights" 등
  label: string; // 버튼에 표시할 문구
  url: string;
  description?: string;
}

/** 정규화된 항공권 오퍼 */
export interface FlightOffer {
  id: string;
  airline: string; // IATA 항공사 코드 (예: KE)
  airlineName: string | null;
  origin: string; // IATA 공항 코드
  destination: string;
  departAt: string; // ISO 8601 (현지 시각 포함)
  arriveAt: string; // ISO 8601
  durationMinutes: number;
  stops: number;
  price: number;
  currency: string;
  deepLink: string | null;
}

/** 정규화된 숙소 오퍼 */
export interface HotelOffer {
  id: string;
  name: string;
  rating: number | null; // 호텔 성급 (1~5)
  score: number | null; // 리뷰 점수 (0~10, 제공되는 경우)
  totalPrice: number | null; // 숙박 기간 총액
  currency: string;
  roomDesc: string | null;
  deepLink: string | null;
}

export type FlightsApiResponse =
  | { mode: "offers"; currency: string; offers: FlightOffer[] }
  | { mode: "links"; links: SearchLink[] };

export type HotelsApiResponse =
  | { mode: "offers"; currency: string; offers: HotelOffer[] }
  | { mode: "links"; links: SearchLink[] };
