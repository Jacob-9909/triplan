/** 국가별 대표 배경 이미지 매핑 (Wikimedia Commons 기반 무료 라이선스 이미지) */
export interface CountryBackground {
  image: string;
  themeColor: string;
}

const COUNTRY_BACKGROUNDS: Record<string, CountryBackground> = {
  // ── 아시아 ──
  "일본": { image: "/backgrounds/japan.jpg", themeColor: "#ffb7c5" }, // 벚꽃 핑크
  "대한민국": { image: "/backgrounds/south-korea.jpg", themeColor: "#7fc8a9" }, // 한라산 청록
  "중국": { image: "/backgrounds/china.jpg", themeColor: "#e05252" }, // 궁궐 레드
  "태국": { image: "/backgrounds/thailand.jpg", themeColor: "#f4b860" }, // 사원 골드
  "베트남": { image: "/backgrounds/vietnam.jpg", themeColor: "#9ccc7f" }, // 라이스 그린
  "싱가포르": { image: "/backgrounds/singapore.jpg", themeColor: "#4fc3dc" }, // 마리나 베이 블루
  "대만": { image: "/backgrounds/taiwan.jpg", themeColor: "#ff9a8c" }, // 등롱 코랄
  "인도네시아": { image: "/backgrounds/indonesia.jpg", themeColor: "#2ec4b6" }, // 발리 틸
  "말레이시아": { image: "/backgrounds/malaysia.jpg", themeColor: "#5aa9e6" }, // KL 스카이 블루
  "필리핀": { image: "/backgrounds/philippines.jpg", themeColor: "#56cfe1" }, // 보라카이 아쿠아
  // ── 유럽 ──
  "프랑스": { image: "/backgrounds/france.jpg", themeColor: "#8ea4d2" }, // 세느강 라벤더 블루
  "이탈리아": { image: "/backgrounds/italy.jpg", themeColor: "#d98e73" }, // 로마 테라코타
  "스페인": { image: "/backgrounds/spain.jpg", themeColor: "#ef8354" }, // 안달루시아 오렌지
  "독일": { image: "/backgrounds/germany.jpg", themeColor: "#6c8ebf" }, // 프로이센 블루
  "영국": { image: "/backgrounds/united-kingdom.jpg", themeColor: "#556991" }, // 로열 네이비
  "스위스": { image: "/backgrounds/switzerland.jpg", themeColor: "#9cc0dd" }, // 알프스 빙하 블루
  "네덜란드": { image: "/backgrounds/netherlands.jpg", themeColor: "#f7a1c4" }, // 튤립 핑크
  "오스트리아": { image: "/backgrounds/austria.jpg", themeColor: "#b8c9cf" }, // 할슈타트 미스트
  "체코": { image: "/backgrounds/czech-republic.jpg", themeColor: "#b76e50" }, // 프라하 앰버
  "포르투갈": { image: "/backgrounds/portugal.jpg", themeColor: "#5b8fb9" }, // 아줄레주 블루
  "그리스": { image: "/backgrounds/greece.jpg", themeColor: "#4da3ff" }, // 에게 해 블루
  "헝가리": { image: "/backgrounds/hungary.jpg", themeColor: "#d9b44a" }, // 부다페스트 골드
  // ── 북미 ──
  "미국": { image: "/backgrounds/usa.jpg", themeColor: "#6b8cce" }, // 골든게이트 허드슨 블루
  "캐나다": { image: "/backgrounds/canada.jpg", themeColor: "#c94b3f" }, // 메이플 레드
  "멕시코": { image: "/backgrounds/mexico.jpg", themeColor: "#e8945a" }, // 테오티우아칸 오렌지
  "쿠바": { image: "/backgrounds/cuba.jpg", themeColor: "#ee8862" }, // 하바나 파스텔 코랄
  "자메이카": { image: "/backgrounds/jamaica.jpg", themeColor: "#58b368" }, // 레게 그린
  "코스타리카": { image: "/backgrounds/costa-rica.jpg", themeColor: "#4caf7d" }, // 정글 그린
  "파나마": { image: "/backgrounds/panama.jpg", themeColor: "#45b5d1" }, // 운하 틸
  "바하마": { image: "/backgrounds/bahamas.jpg", themeColor: "#40c9d6" }, // 카리브 터콰이즈
  // ── 남미 ──
  "브라질": { image: "/backgrounds/brazil.jpg", themeColor: "#43aa8b" }, // 아마존 에메랄드
  "아르헨티나": { image: "/backgrounds/argentina.jpg", themeColor: "#86bbd8" }, // 셀레스테 하늘색
  "칠레": { image: "/backgrounds/chile.jpg", themeColor: "#b56576" }, // 이스터섬 로즈
  "페루": { image: "/backgrounds/peru.jpg", themeColor: "#d08c60" }, // 잉카 테라코타
  "콜롬비아": { image: "/backgrounds/colombia.jpg", themeColor: "#e9b44c" }, // 카테나 옐로우
  "볼리비아": { image: "/backgrounds/bolivia.jpg", themeColor: "#cdb4db" }, // 우유니 러블렌더
  "우루과이": { image: "/backgrounds/uruguay.jpg", themeColor: "#90be6d" }, // 팜파스 그린
  "에콰도르": { image: "/backgrounds/ecuador.jpg", themeColor: "#84a59d" }, // 갈라파고스 그린
  // ── 아프리카 ──
  "이집트": { image: "/backgrounds/egypt.jpg", themeColor: "#d2b48c" }, // 나일 모래색
  "모로코": { image: "/backgrounds/morocco.jpg", themeColor: "#cb6843" }, // 마라케시 테라
  "남아프리카공화국": { image: "/backgrounds/south-africa.jpg", themeColor: "#7ea16b" }, // 케이프 바인 그린
  "케냐": { image: "/backgrounds/kenya.jpg", themeColor: "#dda15e" }, // 사바나 골드
  "탄자니아": { image: "/backgrounds/tanzania.jpg", themeColor: "#bc8a5f" }, // 킬리만자로 앰버
  "튀니지": { image: "/backgrounds/tunisia.jpg", themeColor: "#6aa9d9" }, // 시디부사이드 블루
  "나미비아": { image: "/backgrounds/namibia.jpg", themeColor: "#c1663e" }, // 소수스플레이 레드 샌드
  "세이셸": { image: "/backgrounds/seychelles.jpg", themeColor: "#52b69a" }, // 인도양 그린
  // ── 오세아니아 ──
  "호주": { image: "/backgrounds/australia.jpg", themeColor: "#64a6c9" }, // 시드니 하버 블루
  "뉴질랜드": { image: "/backgrounds/new-zealand.jpg", themeColor: "#57a773" }, // 피오르드 그린
  "피지": { image: "/backgrounds/fiji.jpg", themeColor: "#3fc1c9" }, // 마마누카 라군
  "괌": { image: "/backgrounds/guam.jpg", themeColor: "#48cae4" }, // 투몬 아쿠아
  "사이판": { image: "/backgrounds/saipan.jpg", themeColor: "#5bd1d1" }, // 만가하 민트 블루
  "팔라우": { image: "/backgrounds/palau.jpg", themeColor: "#39a0ed" }, // 록 아일랜드 블루
  "프랑스령 폴리네시아": { image: "/backgrounds/french-polynesia.jpg", themeColor: "#66d1ba" }, // 보라보라 그린 라군
  "파푸아뉴기니": { image: "/backgrounds/papua-new-guinea.jpg", themeColor: "#e07a5f" }, // 라바울 화산 코랄
  // ── 중동 ──
  "아랍에미리트": { image: "/backgrounds/united-arab-emirates.jpg", themeColor: "#b08d57" }, // 두바이 사막 골드
  "터키": { image: "/backgrounds/turkey.jpg", themeColor: "#e29578" }, // 카파도키아 로즈
  "사우디아라비아": { image: "/backgrounds/saudi-arabia.jpg", themeColor: "#cc8b4e" }, // 알울라 앰버
  "카타르": { image: "/backgrounds/qatar.jpg", themeColor: "#8e7dbe" }, // 도하 사막 라벤더
  "이스라엘": { image: "/backgrounds/israel.jpg", themeColor: "#c9ada7" }, // 예루살렘 스톤
  "요르단": { image: "/backgrounds/jordan.jpg", themeColor: "#b5651d" }, // 페트라 로즈 레드
  "오만": { image: "/backgrounds/oman.jpg", themeColor: "#d4a373" }, // 와히바 샌드
  "바레인": { image: "/backgrounds/bahrain.jpg", themeColor: "#a26769" }, // 진주 레드
};

/** 국가 이름으로 배경 정보를 찾는다. 없으면 null (컴포넌트에서 대륙별 폴백 처리) */
export function getCountryBackground(countryName?: string | null): CountryBackground | null {
  if (!countryName) return null;
  return COUNTRY_BACKGROUNDS[countryName] ?? null;
}
