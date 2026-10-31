/** 도시별 대표 사진 (scripts/fetch-city-photos.mjs 가 만든다). 없으면 나라 사진을 쓴다 */
const CITY_BACKGROUNDS: Record<string, string> = {
  "도쿄": "/backgrounds/cities/tokyo.jpg",
  "오사카": "/backgrounds/cities/osaka.jpg",
  "교토": "/backgrounds/cities/kyoto.jpg",
  "후쿠오카": "/backgrounds/cities/fukuoka.jpg",
  "삿포로": "/backgrounds/cities/sapporo.jpg",
  "오키나와": "/backgrounds/cities/okinawa.jpg",
  "서울": "/backgrounds/cities/seoul.jpg",
  "부산": "/backgrounds/cities/busan.jpg",
  "제주": "/backgrounds/cities/jeju.jpg",
  "경주": "/backgrounds/cities/gyeongju.jpg",
  "베이징": "/backgrounds/cities/beijing.jpg",
  "상하이": "/backgrounds/cities/shanghai.jpg",
  "홍콩": "/backgrounds/cities/hong-kong.jpg",
  "방콕": "/backgrounds/cities/bangkok.jpg",
  "치앙마이": "/backgrounds/cities/chiang-mai.jpg",
  "푸켓": "/backgrounds/cities/phuket.jpg",
  "하노이": "/backgrounds/cities/hanoi.jpg",
  "호치민": "/backgrounds/cities/ho-chi-minh.jpg",
  "다낭": "/backgrounds/cities/da-nang.jpg",
  "호이안": "/backgrounds/cities/hoi-an.jpg",
  "할롱베이": "/backgrounds/cities/ha-long-bay.jpg",
  "타이베이": "/backgrounds/cities/taipei.jpg",
  "지우펀": "/backgrounds/cities/jiufen.jpg",
  "발리 쿠타": "/backgrounds/cities/bali-kuta.jpg",
  "쿠알라룸푸르": "/backgrounds/cities/kuala-lumpur.jpg",
  "세부": "/backgrounds/cities/cebu.jpg",
  "보라카이": "/backgrounds/cities/boracay.jpg",
  "파리": "/backgrounds/cities/paris.jpg",
  "니스": "/backgrounds/cities/nice.jpg",
  "로마": "/backgrounds/cities/rome.jpg",
  "베네치아": "/backgrounds/cities/venice.jpg",
  "피렌체": "/backgrounds/cities/florence.jpg",
  "밀라노": "/backgrounds/cities/milan.jpg",
  "바르셀로나": "/backgrounds/cities/barcelona.jpg",
  "마드리드": "/backgrounds/cities/madrid.jpg",
  "런던": "/backgrounds/cities/london.jpg",
  "에든버러": "/backgrounds/cities/edinburgh.jpg",
  "인터라켄": "/backgrounds/cities/interlaken.jpg",
  "루체른": "/backgrounds/cities/lucerne.jpg",
  "암스테르담": "/backgrounds/cities/amsterdam.jpg",
  "빈": "/backgrounds/cities/vienna.jpg",
  "잘츠부르크": "/backgrounds/cities/salzburg.jpg",
  "할슈타트": "/backgrounds/cities/hallstatt.jpg",
  "프라하": "/backgrounds/cities/prague.jpg",
  "리스본": "/backgrounds/cities/lisbon.jpg",
  "포르투": "/backgrounds/cities/porto.jpg",
  "아테네": "/backgrounds/cities/athens.jpg",
  "부다페스트": "/backgrounds/cities/budapest.jpg",
  "뉴욕": "/backgrounds/cities/new-york.jpg",
  "샌프란시스코": "/backgrounds/cities/san-francisco.jpg",
  "로스앤젤레스": "/backgrounds/cities/los-angeles.jpg",
  "라스베이거스": "/backgrounds/cities/las-vegas.jpg",
  "호놀룰루": "/backgrounds/cities/honolulu.jpg",
  "밴쿠버": "/backgrounds/cities/vancouver.jpg",
  "칸쿤": "/backgrounds/cities/cancun.jpg",
  "시드니": "/backgrounds/cities/sydney.jpg",
  "멜버른": "/backgrounds/cities/melbourne.jpg",
  "퀸스타운": "/backgrounds/cities/queenstown.jpg",
  "두바이": "/backgrounds/cities/dubai.jpg",
  "이스탄불": "/backgrounds/cities/istanbul.jpg",
  "카파도키아": "/backgrounds/cities/cappadocia.jpg",
  "마라케시": "/backgrounds/cities/marrakesh.jpg",
  "카이로": "/backgrounds/cities/cairo.jpg",
  "케이프타운": "/backgrounds/cities/cape-town.jpg",
};

export function getCityBackground(city?: string | null): string | null {
  if (!city) return null;
  return CITY_BACKGROUNDS[city.trim()] ?? null;
}

/** "교토 단풍"처럼 제목 안에 든 도시 이름으로 찾는다 (긴 이름부터 맞춘다) */
export function findCityBackground(text?: string | null): string | null {
  if (!text) return null;
  const names = Object.keys(CITY_BACKGROUNDS).sort((a, b) => b.length - a.length);
  const hit = names.find((n) => text.includes(n));
  return hit ? CITY_BACKGROUNDS[hit] : null;
}
