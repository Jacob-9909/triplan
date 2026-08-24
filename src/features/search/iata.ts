export interface IataCity {
  code: string; // IATA 공항 코드
  city: string; // 도시 한글명
  cityEn: string;
  country: string; // 국가 한글명
}

/**
 * 주요 출발/도착 도시 매핑 (하드코딩).
 * 자동완성 검색 대상이며, Trip.region 프리필 매칭에도 사용된다.
 */
export const IATA_CITIES: IataCity[] = [
  { code: "ICN", city: "서울/인천", cityEn: "Seoul Incheon", country: "대한민국" },
  { code: "GMP", city: "서울/김포", cityEn: "Seoul Gimpo", country: "대한민국" },
  { code: "PUS", city: "부산", cityEn: "Busan", country: "대한민국" },
  { code: "CJU", city: "제주", cityEn: "Jeju", country: "대한민국" },
  { code: "NRT", city: "도쿄/나리타", cityEn: "Tokyo Narita", country: "일본" },
  { code: "HND", city: "도쿄/하네다", cityEn: "Tokyo Haneda", country: "일본" },
  { code: "KIX", city: "오사카", cityEn: "Osaka", country: "일본" },
  { code: "FUK", city: "후쿠오카", cityEn: "Fukuoka", country: "일본" },
  { code: "OKA", city: "오키나와", cityEn: "Okinawa", country: "일본" },
  { code: "CTS", city: "삿포로", cityEn: "Sapporo", country: "일본" },
  { code: "PEK", city: "베이징", cityEn: "Beijing", country: "중국" },
  { code: "PVG", city: "상하이", cityEn: "Shanghai", country: "중국" },
  { code: "HKG", city: "홍콩", cityEn: "Hong Kong", country: "홍콩" },
  { code: "TPE", city: "타이베이", cityEn: "Taipei", country: "대만" },
  { code: "BKK", city: "방콕", cityEn: "Bangkok", country: "태국" },
  { code: "SIN", city: "싱가포르", cityEn: "Singapore", country: "싱가포르" },
  { code: "KUL", city: "쿠알라룸푸르", cityEn: "Kuala Lumpur", country: "말레이시아" },
  { code: "HAN", city: "하노이", cityEn: "Hanoi", country: "베트남" },
  { code: "SGN", city: "호치민", cityEn: "Ho Chi Minh City", country: "베트남" },
  { code: "DAD", city: "다낭", cityEn: "Da Nang", country: "베트남" },
  { code: "CEB", city: "세부", cityEn: "Cebu", country: "필리핀" },
  { code: "DPS", city: "발리", cityEn: "Bali Denpasar", country: "인도네시아" },
  { code: "DEL", city: "델리", cityEn: "Delhi", country: "인도" },
  { code: "DXB", city: "두바이", cityEn: "Dubai", country: "아랍에미리트" },
  { code: "IST", city: "이스탄불", cityEn: "Istanbul", country: "터키" },
  { code: "LHR", city: "런던", cityEn: "London", country: "영국" },
  { code: "CDG", city: "파리", cityEn: "Paris", country: "프랑스" },
  { code: "FCO", city: "로마", cityEn: "Rome", country: "이탈리아" },
  { code: "BCN", city: "바르셀로나", cityEn: "Barcelona", country: "스페인" },
  { code: "AMS", city: "암스테르담", cityEn: "Amsterdam", country: "네덜란드" },
  { code: "FRA", city: "프랑크푸르트", cityEn: "Frankfurt", country: "독일" },
  { code: "ZRH", city: "취리히", cityEn: "Zurich", country: "스위스" },
  { code: "PRG", city: "프라하", cityEn: "Prague", country: "체코" },
  { code: "JFK", city: "뉴욕", cityEn: "New York", country: "미국" },
  { code: "LAX", city: "로스앤젤레스", cityEn: "Los Angeles", country: "미국" },
  { code: "SFO", city: "샌프란시스코", cityEn: "San Francisco", country: "미국" },
  { code: "SEA", city: "시애틀", cityEn: "Seattle", country: "미국" },
  { code: "ORD", city: "시카고", cityEn: "Chicago", country: "미국" },
  { code: "HNL", city: "호놀룰루", cityEn: "Honolulu", country: "미국" },
  { code: "GUM", city: "괌", cityEn: "Guam", country: "미국" },
  { code: "YVR", city: "밴쿠버", cityEn: "Vancouver", country: "캐나다" },
  { code: "YYZ", city: "토론토", cityEn: "Toronto", country: "캐나다" },
  { code: "SYD", city: "시드니", cityEn: "Sydney", country: "호주" },
  { code: "MEL", city: "멜버른", cityEn: "Melbourne", country: "호주" },
  { code: "AKL", city: "오클랜드", cityEn: "Auckland", country: "뉴질랜드" },
];

/** 자동완성: 한글/영문/코드 부분 일치 검색 */
export function searchIata(query: string): IataCity[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return IATA_CITIES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.city.includes(query.trim()) ||
      c.cityEn.toLowerCase().includes(q) ||
      c.country.includes(query.trim()),
  ).slice(0, 8);
}

/** 정확한 코드 조회 */
export function findIata(code: string): IataCity | null {
  return IATA_CITIES.find((c) => c.code === code.toUpperCase()) ?? null;
}

/** Trip.region("도쿄", "Osaka", "도쿄/나리타" 등)으로 가장 유사한 도시 추천 */
export function matchRegionToIata(region: string | null | undefined): IataCity | null {
  if (!region) return null;
  const r = region.trim();
  if (!r) return null;
  // 코드 직접 입력
  const byCode = findIata(r);
  if (byCode) return byCode;
  // 한글/영문 부분 일치 (양방향 포함)
  return (
    IATA_CITIES.find(
      (c) =>
        c.city.includes(r) ||
        r.includes(c.city.split("/")[0]) ||
        c.cityEn.toLowerCase().includes(r.toLowerCase()) ||
        r.toLowerCase().includes(c.cityEn.toLowerCase()),
    ) ?? null
  );
}
