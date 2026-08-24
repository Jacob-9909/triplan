import type { Continent } from "@/lib/types";

/** 국가별 주요 도시/지역 */
export interface City {
  name: string;
  lat: number;
  lng: number;
  emoji: string;
  description: string;
}

export interface Country {
  name: string;
  flag: string; // 국기 이모지
  currency: string; // 현지 화폐 코드 (예: JPY)
  cities: City[];
}

export interface ContinentData {
  id: Continent;
  name: string;
  emoji: string;
  countries: Country[];
}

/** 여행지 선택 완료 결과 */
export interface DestinationSelection {
  continent: ContinentData;
  country: Country;
  city: City;
}

export const WORLD: ContinentData[] = [
  {
    id: "asia",
    name: "아시아",
    emoji: "🏯",
    countries: [
      {
        name: "일본",
        flag: "🇯🇵",
        currency: "JPY",
        cities: [
          { name: "도쿄", lat: 35.6762, lng: 139.6503, emoji: "🗼", description: "네온 가득한 일본의 수도" },
          { name: "오사카", lat: 34.6937, lng: 135.5023, emoji: "🐙", description: "먹방의 도시, 타코야끼 천국" },
          { name: "교토", lat: 35.0116, lng: 135.7681, emoji: "⛩️", description: "천 년의 고도와 기모노 거리" },
          { name: "후쿠오카", lat: 33.5904, lng: 130.4017, emoji: "🍜", description: "하카타 돈코츠 라멘의 본고장" },
          { name: "삿포로", lat: 43.0618, lng: 141.3545, emoji: "❄️", description: "설축제로 유명한 홋카이도 중심지" },
          { name: "오키나와", lat: 26.2124, lng: 127.6809, emoji: "🌺", description: "남국의 에메랄드 해변" },
        ],
      },
      {
        name: "대한민국",
        flag: "🇰🇷",
        currency: "KRW",
        cities: [
          { name: "서울", lat: 37.5665, lng: 126.978, emoji: "🏙️", description: "고궁과 K컬처가 공존하는 수도" },
          { name: "부산", lat: 35.1796, lng: 129.0756, emoji: "🌊", description: "해운대와 광안리의 바다 도시" },
          { name: "제주", lat: 33.4996, lng: 126.5312, emoji: "🍊", description: "한라산과 유채꽃의 섬" },
          { name: "경주", lat: 35.8562, lng: 129.2247, emoji: "🏺", description: "천년 고도 신라의 흔적" },
          { name: "강릉", lat: 37.7519, lng: 128.8761, emoji: "☕", description: "동해 커피거리와 게텐바우" },
          { name: "전주", lat: 35.8242, lng: 127.148, emoji: "🍚", description: "비빔밥과 한옥마을의 도시" },
        ],
      },
      {
        name: "중국",
        flag: "🇨🇳",
        currency: "CNY",
        cities: [
          { name: "베이징", lat: 39.9042, lng: 116.4074, emoji: "🏮", description: "자금성과 만리장성의 고도" },
          { name: "상하이", lat: 31.2304, lng: 121.4737, emoji: "🌆", description: "외탄의 야경이 아름다운 마천루 도시" },
          { name: "시안", lat: 34.3416, lng: 108.9398, emoji: "🗿", description: "병마용의 고향, 실크로드의 시작점" },
          { name: "청두", lat: 30.5728, lng: 104.0668, emoji: "🐼", description: "판다와 매운 향차이의 도시" },
          { name: "홍콩", lat: 22.3193, lng: 114.1694, emoji: "🛳️", description: "빅토리아 하버의 광활한 스카이라인" },
          { name: "항저우", lat: 30.2741, lng: 120.1551, emoji: "🏞️", description: "'천국에 이은 서호'의 도시" },
        ],
      },
      {
        name: "태국",
        flag: "🇹🇭",
        currency: "THB",
        cities: [
          { name: "방콕", lat: 13.7563, lng: 100.5018, emoji: "🛕", description: "왓 아룬과 야시장의 불야도" },
          { name: "치앙마이", lat: 18.7883, lng: 98.9853, emoji: "🐘", description: "코끼리와 사원의 느긋한 산간 도시" },
          { name: "푸켓", lat: 7.8804, lng: 98.3923, emoji: "🏖️", description: "파타야 비치와 섬 투어의 낙원" },
          { name: "크라비", lat: 8.0863, lng: 98.9063, emoji: "⛰️", description: "석회암 절벽과 에메랄드 바다" },
          { name: "파타야", lat: 12.9236, lng: 100.8825, emoji: "🎡", description: "해변과 워킹스트리트의 휴양지" },
          { name: "후아힌", lat: 12.5683, lng: 99.9577, emoji: "🐴", description: "왕실 휴양지의 조용한 해변" },
        ],
      },
      {
        name: "베트남",
        flag: "🇻🇳",
        currency: "VND",
        cities: [
          { name: "하노이", lat: 21.0285, lng: 105.8542, emoji: "🛺", description: "올드쿼터의 오토바이 세상" },
          { name: "호치민", lat: 10.8231, lng: 106.6297, emoji: "🥖", description: "반미와 프랑스풍 건축의 활기찬 도시" },
          { name: "다낭", lat: 16.0544, lng: 108.2022, emoji: "🌉", description: "미케비치와 용다리의 휴양 도시" },
          { name: "호이안", lat: 15.8801, lng: 108.338, emoji: "🏮", description: "등불로 물드는 고도" },
          { name: "나트랑", lat: 12.2388, lng: 109.1967, emoji: "🤿", description: "다이빙 명소의 조용한 해변 도시" },
          { name: "할롱베이", lat: 20.9101, lng: 107.1839, emoji: "⛵", description: "카르스트 지형의 절경 크루즈" },
        ],
      },
      {
        name: "싱가포르",
        flag: "🇸🇬",
        currency: "SGD",
        cities: [
          { name: "마리나 베이", lat: 1.2834, lng: 103.8607, emoji: "🌇", description: "가든스 바 더 베이의 미래도시" },
          { name: "센토사", lat: 1.2494, lng: 103.8303, emoji: "🎢", description: "유니버설 스튜디오가 있는 리조트 섬" },
          { name: "차이나타운", lat: 1.2816, lng: 103.8445, emoji: "🥟", description: "호커센터 먹거리 천국" },
          { name: "리틀 인디아", lat: 1.3068, lng: 103.8517, emoji: "🎨", description: "향신료와 컬러풀한 샵하우스 거리" },
          { name: "오차드 로드", lat: 1.3048, lng: 103.8318, emoji: "🛍️", description: "쇼핑몰이 쉴 새 없는 번화가" },
          { name: "주론", lat: 1.3329, lng: 103.7436, emoji: "🐸", description: "주론 개구리 시장의 밤 먹거리" },
        ],
      },
      {
        name: "대만",
        flag: "🇹🇼",
        currency: "TWD",
        cities: [
          { name: "타이베이", lat: 25.033, lng: 121.5654, emoji: "🌃", description: "타이베이101과 스머무 천국" },
          { name: "지우펀", lat: 25.1094, lng: 121.8446, emoji: "🏮", description: "'센과 치히로'를 연상시키는 산속 골목" },
          { name: "가오슝", lat: 22.6273, lng: 120.3014, emoji: "🚢", description: "포모사 다리와 항구의 활기" },
          { name: "화롄", lat: 23.991, lng: 121.6014, emoji: "🏔️", description: "타로코 협곡으로 가는 관문" },
          { name: "타이난", lat: 22.9998, lng: 120.227, emoji: "🦆", description: "대만 요리의 원조 고도" },
          { name: "타이중", lat: 24.1477, lng: 120.6736, emoji: "🌈", description: "가오메이 습지와 밤시장의 도시" },
        ],
      },
      {
        name: "인도네시아",
        flag: "🇮🇩",
        currency: "IDR",
        cities: [
          { name: "발리 우부드", lat: -8.5069, lng: 115.2625, emoji: "🌿", description: "라이스 테라스와 요가의 마을" },
          { name: "발리 쿠타", lat: -8.7176, lng: 115.1686, emoji: "🏄", description: "서핑과 선셋의 해변 리조트" },
          { name: "자카르타", lat: -6.2088, lng: 106.8456, emoji: "🏙️", description: "인도네시아의 역동적인 수도" },
          { name: "조그자카르타", lat: -7.7956, lng: 110.3695, emoji: "🛕", description: "보로부두르 사원으로 가는 문" },
          { name: "코모도", lat: -8.5567, lng: 119.4889, emoji: "🦎", description: "코모도 도마뱀과 핑크 비치" },
          { name: "롬복", lat: -8.5833, lng: 116.3167, emoji: "🏝️", description: "발리 옆의 숨은 힐링 섬" },
        ],
      },
      {
        name: "말레이시아",
        flag: "🇲🇾",
        currency: "MYR",
        cities: [
          { name: "쿠알라룸푸르", lat: 3.139, lng: 101.6869, emoji: "🕌", description: "페트로나스 트윈타워의 수도" },
          { name: "페낭", lat: 5.4141, lng: 100.3288, emoji: "🍲", description: "거리 미식과 유산 건축의 섬" },
          { name: "말라카", lat: 2.1896, lng: 102.2501, emoji: "🏰", description: "포르투갈 식민지 흔적의 유적 도시" },
          { name: "코타키나발루", lat: 5.9804, lng: 116.0735, emoji: "🌅", description: "세계적인 선셋 보루 보르네오" },
          { name: "캐머런 하이랜드", lat: 4.4695, lng: 101.3841, emoji: "🍃", description: "차밭이 펼쳐진 고원 휴양지" },
          { name: "랑카위", lat: 6.3508, lng: 99.7799, emoji: "🦅", description: "면세 쇼핑과 망그로브 생태 섬" },
        ],
      },
      {
        name: "필리핀",
        flag: "🇵🇭",
        currency: "PHP",
        cities: [
          { name: "보라카이", lat: 11.9674, lng: 121.9248, emoji: "🏝️", description: "화이트 비치의 세계적 휴양 섬" },
          { name: "세부", lat: 10.3157, lng: 123.8854, emoji: "🐬", description: "돌고래 투어와 카와산 폭포" },
          { name: "엘니도", lat: 11.1804, lng: 119.3906, emoji: "🛶", description: "라군이 가득한 팔라완의 낙원" },
          { name: "보홀", lat: 9.6511, lng: 123.8619, emoji: "🍫", description: "초콜릿 힐스와 타시어 섬" },
          { name: "마닐라", lat: 14.5995, lng: 120.9842, emoji: "🌆", description: "인트라무로스 성곽의 역동적 수도" },
          { name: "시앙가오", lat: 9.1253, lng: 126.1996, emoji: "🪨", description: "클라우드 나인 서핑 명소" },
        ],
      },
    ],
  },
  {
    id: "europe",
    name: "유럽",
    emoji: "🏰",
    countries: [
      {
        name: "프랑스",
        flag: "🇫🇷",
        currency: "EUR",
        cities: [
          { name: "파리", lat: 48.8566, lng: 2.3522, emoji: "🗼", description: "에펠탑과 세느강의 예술 도시" },
          { name: "니스", lat: 43.7102, lng: 7.262, emoji: "🌞", description: "코트다쥐르의 파란 해안" },
          { name: "리용", lat: 45.764, lng: 4.8357, emoji: "🍽️", description: "프랑스 미식의 수도" },
          { name: "마르세유", lat: 43.2965, lng: 5.3698, emoji: "⚓", description: "지중해 항구의 부이야베스" },
          { name: "스트라스부르", lat: 48.5734, lng: 7.7521, emoji: "🎄", description: "독일과 프랑스가 섞인 목조 집들" },
          { name: "보르도", lat: 44.8378, lng: -0.5792, emoji: "🍷", description: "세계적인 와인 산지의 도시" },
        ],
      },
      {
        name: "이탈리아",
        flag: "🇮🇹",
        currency: "EUR",
        cities: [
          { name: "로마", lat: 41.9028, lng: 12.4964, emoji: "🏟️", description: "콜로세움과 바티칸의 영원한 도시" },
          { name: "베네치아", lat: 45.4408, lng: 12.3155, emoji: "🚤", description: "곤돌라가 오가는 물의 도시" },
          { name: "피렌체", lat: 43.7696, lng: 11.2558, emoji: "🎨", description: "르네상스 미술의 발상지" },
          { name: "밀라노", lat: 45.4642, lng: 9.19, emoji: "👗", description: "패션과 최후의 만찬의 도시" },
          { name: "나폴리", lat: 40.8518, lng: 14.2681, emoji: "🍕", description: "마르게리타 피자의 본고장" },
          { name: "친퀘테레", lat: 44.1461, lng: 9.6439, emoji: "🏘️", description: "절벽 위의 알록달록 다섯 마을" },
        ],
      },
      {
        name: "스페인",
        flag: "🇪🇸",
        currency: "EUR",
        cities: [
          { name: "바르셀로나", lat: 41.3874, lng: 2.1686, emoji: "⛪", description: "가우디의 사그라다 파밀리아" },
          { name: "마드리드", lat: 40.4168, lng: -3.7038, emoji: "💃", description: "플라멩코와 프라도 미술관" },
          { name: "세비야", lat: 37.3891, lng: -5.9845, emoji: "🌹", description: "알카사르 정원의 안달루시아" },
          { name: "그라나다", lat: 37.1773, lng: -3.5986, emoji: "🕌", description: "알함브라 궁전의 황금 정원" },
          { name: "산세바스티안", lat: 43.3183, lng: -1.9812, emoji: "🍢", description: "핀토스 미식의 북부 해변 도시" },
          { name: "발렌시아", lat: 39.4699, lng: -0.3763, emoji: "🥘", description: "파에야의 고향과 미래 도시" },
        ],
      },
      {
        name: "독일",
        flag: "🇩🇪",
        currency: "EUR",
        cities: [
          { name: "베를린", lat: 52.52, lng: 13.405, emoji: "🐻", description: "벽과 클럽의 자유로운 수도" },
          { name: "뮌헨", lat: 48.1351, lng: 11.582, emoji: "🍺", description: "옥토버페스트와 맥주홀의 도시" },
          { name: "함부르크", lat: 53.5511, lng: 9.9937, emoji: "🚢", description: "엠베 항구의 북부 상업 도시" },
          { name: "프랑크푸르트", lat: 50.1109, lng: 8.6821, emoji: "🏦", description: "마인 강변의 금융 스카이라인" },
          { name: "쾰른", lat: 50.9375, lng: 6.9603, emoji: "⛪", description: "쾰른 대성당의 고딕 실루엣" },
          { name: "드레스덴", lat: 51.0504, lng: 13.7373, emoji: "👑", description: "엘베 강변의 '북부 플로렌스'" },
        ],
      },
      {
        name: "영국",
        flag: "🇬🇧",
        currency: "GBP",
        cities: [
          { name: "런던", lat: 51.5074, lng: -0.1278, emoji: "🎡", description: "빅벤과 박물관의 세계 수도" },
          { name: "에든버러", lat: 55.9533, lng: -3.1883, emoji: "🎻", description: "성과 축제의 스코틀랜드 수도" },
          { name: "맨체스터", lat: 53.4808, lng: -2.2426, emoji: "⚽", description: "축구 성지의 산업 혁명 도시" },
          { name: "바스", lat: 51.3811, lng: -2.359, emoji: "♨️", description: "로마 온천의 조지안 건축" },
          { name: "요크", lat: 53.9599, lng: -1.0873, emoji: "🏛️", description: "중세 골목의 미니어처 도시" },
          { name: "브라이튼", lat: 50.8225, lng: -0.1372, emoji: "🎪", description: "해변 부두의 자유로운 리조트" },
        ],
      },
      {
        name: "스위스",
        flag: "🇨🇭",
        currency: "CHF",
        cities: [
          { name: "취리히", lat: 47.3769, lng: 8.5417, emoji: "💎", description: "호수와 금융의 깔끔한 도시" },
          { name: "루체른", lat: 47.0502, lng: 8.3093, emoji: "🌉", description: "채플 다리와 알프스 호수" },
          { name: "인터라켄", lat: 46.6863, lng: 7.8632, emoji: "🪂", description: "융프라우 관문의 액티비티 도시" },
          { name: "체르마트", lat: 46.0207, lng: 7.7491, emoji: "⛰️", description: "마터호른 발치의 산악 마을" },
          { name: "제네바", lat: 46.2044, lng: 6.1432, emoji: "🕊️", description: "국제기구와 제트분수의 도시" },
          { name: "베른", lat: 46.948, lng: 7.4474, emoji: "🕰️", description: "중세 구시가지의 느린 수도" },
        ],
      },
      {
        name: "네덜란드",
        flag: "🇳🇱",
        currency: "EUR",
        cities: [
          { name: "암스테르담", lat: 52.3676, lng: 4.9041, emoji: "🚲", description: "운하와 자전거의 자유 도시" },
          { name: "로테르담", lat: 51.9244, lng: 4.4777, emoji: "🏗️", description: "현대 건축의 항구 도시" },
          { name: "헤이그", lat: 52.0705, lng: 4.3007, emoji: "⚖️", description: "왕궁과 국제재판소의 도시" },
          { name: "델프트", lat: 52.0067, lng: 4.3556, emoji: "🏺", description: "델프트블루 도자기의 작은 도시" },
          { name: "위트레흐트", lat: 52.0907, lng: 5.1214, emoji: "⛵", description: "운하 창가 카페의 대학 도시" },
          { name: "하를렘", lat: 52.3792, lng: 4.6389, emoji: "🌷", description: "튤립 밭으로 가는 문턱" },
        ],
      },
      {
        name: "오스트리아",
        flag: "🇦🇹",
        currency: "EUR",
        cities: [
          { name: "빈", lat: 48.2082, lng: 16.3738, emoji: "🎼", description: "음악과 커피하우스의 제국 수도" },
          { name: "잘츠부르크", lat: 47.8095, lng: 13.055, emoji: "🎵", description: "모차르트와 사운드 오브 뮤직" },
          { name: "인스부르크", lat: 47.2692, lng: 11.4041, emoji: "⛷️", description: "알프스 계곡의 동계 수도" },
          { name: "할슈타트", lat: 47.5622, lng: 13.6493, emoji: "🪞", description: "호수에 비치는 포스트카드 마을" },
          { name: "그라츠", lat: 47.0707, lng: 15.4395, emoji: "🎓", description: "유네스코 구시가지의 대학 도시" },
          { name: "린츠", lat: 48.3069, lng: 14.2858, emoji: "🍰", description: "린저 토르테의 다뉴브 도시" },
        ],
      },
      {
        name: "체코",
        flag: "🇨🇿",
        currency: "CZK",
        cities: [
          { name: "프라하", lat: 50.0755, lng: 14.4378, emoji: "🏰", description: "백탑과 카를교의 황금 도시" },
          { name: "체스키크룸로프", lat: 48.8127, lng: 14.3175, emoji: "🎀", description: "굽이치는 강 위의 중세 소도시" },
          { name: "카를로비바리", lat: 50.2304, lng: 12.871, emoji: "⛲", description: "온천수와 보헤미아 수정의 도시" },
          { name: "브르노", lat: 49.1951, lng: 16.6068, emoji: "🎪", description: "현대건축과 학생들의 활기찬 도시" },
          { name: "쿠트나호라", lat: 49.9484, lng: 15.2681, emoji: "💀", description: "성곽 교회로 유명한 은광 도시" },
          { name: "올로모우츠", lat: 49.5938, lng: 17.2509, emoji: "🕯️", description: "성 삼위일체 광장의 평화로운 도시" },
        ],
      },
      {
        name: "포르투갈",
        flag: "🇵🇹",
        currency: "EUR",
        cities: [
          { name: "리스본", lat: 38.7223, lng: -9.1393, emoji: "🚋", description: "트램과 아즈레주의 언덕 도시" },
          { name: "포르투", lat: 41.1579, lng: -8.6291, emoji: "🍷", description: "포트 와인과 두루 강의 도시" },
          { name: "신트라", lat: 38.7979, lng: -9.3907, emoji: "🏰", description: "페나 궁전의 동화 마을" },
          { name: "라고스", lat: 37.0802, lng: -8.6655, emoji: "🏖️", description: "알가르베의 절벽 해변" },
          { name: "코임브라", lat: 40.2033, lng: -8.4103, emoji: "📚", description: "고대 대학과 파두의 도시" },
          { name: "아비스", lat: 38.5243, lng: -8.9002, emoji: "🌾", description: "아렌테주 평원의 조용한 마을" },
        ],
      },
      {
        name: "그리스",
        flag: "🇬🇷",
        currency: "EUR",
        cities: [
          { name: "아테네", lat: 37.9838, lng: 23.7275, emoji: "🏛️", description: "아크로폴리스의 고대 수도" },
          { name: "산토리니", lat: 36.3932, lng: 25.4615, emoji: "🤍", description: "흰 집과 파란 돔의 칼데라 섬" },
          { name: "미코노스", lat: 37.4450, lng: 25.3281, emoji: "🌬️", description: "풍차와 파티의 세련된 섬" },
          { name: "테살로니키", lat: 40.6401, lng: 22.9444, emoji: "🕌", description: "비잔틴 유적의 북부 항구 도시" },
          { name: "델포이", lat: 38.4824, lng: 22.8946, emoji: "🔮", description: "신탁의 산중 고대 성지" },
          { name: "로도스", lat: 36.4406, lng: 28.2222, emoji: "🌞", description: "중세 기사단 성의 태양 섬" },
        ],
      },
      {
        name: "헝가리",
        flag: "🇭🇺",
        currency: "HUF",
        cities: [
          { name: "부다페스트", lat: 47.4979, lng: 19.0402, emoji: "🌉", description: "다뉴브의 진주, 온천과 야경" },
          { name: "에거", lat: 47.9025, lng: 20.3772, emoji: "🍷", description: "불카니 적포도주의 도시" },
          { name: "세게드", lat: 46.253, lng: 20.1414, emoji: "☀️", description: "태양의 도시, 종탑 광장" },
          { name: "페치", lat: 46.0727, lng: 18.2323, emoji: "🏺", description: "로마 시대 유물의 문화 도시" },
          { name: "호르토파지", lat: 47.5844, lng: 21.0411, emoji: "🐎", description: "초원과 유목 문화의 평원" },
          { name: "발라톤", lat: 46.9089, lng: 17.8883, emoji: "🏊", description: "'헝가리 바다' 호수 리조트" },
        ],
      },
    ],
  },
  {
    id: "north-america",
    name: "북미",
    emoji: "🗽",
    countries: [
      {
        name: "미국",
        flag: "🇺🇸",
        currency: "USD",
        cities: [
          { name: "뉴욕", lat: 40.7128, lng: -74.006, emoji: "🌃", description: "타임스퀘어와 센트럴파크" },
          { name: "로스앤젤레스", lat: 34.0522, lng: -118.2437, emoji: "🌴", description: "할리우드와 산타모니카" },
          { name: "샌프란시스코", lat: 37.7749, lng: -122.4194, emoji: "🌉", description: "골든게이트와 케이블카" },
          { name: "라스베이거스", lat: 36.1699, lng: -115.1398, emoji: "🎰", description: "사막 속 네온 엔터테인먼트 도시" },
          { name: "시카고", lat: 41.8781, lng: -87.6298, emoji: "🎷", description: "블루스와 빌딩숲의 호수 도시" },
          { name: "호놀룰루", lat: 21.3069, lng: -157.8583, emoji: "🌺", description: "와이키키 해변의 하와이" },
          { name: "마이애미", lat: 25.7617, lng: -80.1918, emoji: "🍹", description: "사우스비치의 라틴 열기" },
          { name: "시애틀", lat: 47.6062, lng: -122.3321, emoji: "☔", description: "커피와 그런지의 비내리는 도시" },
        ],
      },
      {
        name: "캐나다",
        flag: "🇨🇦",
        currency: "CAD",
        cities: [
          { name: "토론토", lat: 43.6532, lng: -79.3832, emoji: "🏢", description: "CN타워와 다문화 대도시" },
          { name: "밴쿠버", lat: 49.2827, lng: -123.1207, emoji: "🏔️", description: "바다와 산이 만나는 항구 도시" },
          { name: "몬트리올", lat: 45.5019, lng: -73.5674, emoji: "🥐", description: "유럽 감성의 퀘벡 메트로폴리스" },
          { name: "퀘벡시티", lat: 46.8139, lng: -71.208, emoji: "🍁", description: "성벽으로 둘러싸인 프랑스풍 올드타운" },
          { name: "캘거리", lat: 51.0447, lng: -114.0719, emoji: "🤠", description: "스탬피드와 로키 관문" },
          { name: "나이아가라", lat: 43.0962, lng: -79.0377, emoji: "💦", description: "캐나다 폭포의 웅장한 절경" },
          { name: "오타와", lat: 45.4215, lng: -75.6972, emoji: "🏒", description: "의회 언덕과 튤립 페스티벌" },
          { name: "핼리팩스", lat: 44.6488, lng: -63.5752, emoji: "⚓", description: "대서양 항구의 역사 도시" },
        ],
      },
      {
        name: "멕시코",
        flag: "🇲🇽",
        currency: "MXN",
        cities: [
          { name: "칸쿤", lat: 21.1619, lng: -86.8515, emoji: "🏖️", description: "카리브해 올인클루브 리조트" },
          { name: "멕시코시티", lat: 19.4326, lng: -99.1332, emoji: "🏛️", description: "테오티우아칸과 타코의 거대 수도" },
          { name: "과달라하라", lat: 20.6597, lng: -103.3496, emoji: "🎸", description: "마리아치와 데킬라의 도시" },
          { name: "툴룸", lat: 20.2114, lng: -87.4654, emoji: "🛕", description: "절벽 위 마야 유적과 셀레스툰" },
          { name: "오아하카", lat: 17.0732, lng: -96.7266, emoji: "🌶️", description: "몰레와 민속 예술의 고원 도시" },
          { name: "산미겔 데 알렌데", lat: 20.9144, lng: -100.7452, emoji: "🎨", description: "콜로니얼 건축의 예술 마을" },
          { name: "로스카보스", lat: 22.8905, lng: -109.9167, emoji: "🐋", description: "바하는 고래 관찰의 낙원" },
          { name: "메리다", lat: 20.9674, lng: -89.5926, emoji: "🌻", description: "마야 문명의 하얀 도시" },
        ],
      },
      {
        name: "쿠바",
        flag: "🇨🇺",
        currency: "CUP",
        cities: [
          { name: "아바나", lat: 23.1136, lng: -82.3666, emoji: "🚗", description: "올드카와 살사의 시간 멈춘 수도" },
          { name: "트리니다드", lat: 21.8036, lng: -79.985, emoji: "🏡", description: "파스텔 색 콜로니얼 유적 마을" },
          { name: "바라데로", lat: 23.1541, lng: -81.2073, emoji: "🌴", description: "20km 백사장의 휴양지" },
          { name: "산티아고", lat: 20.0247, lng: -75.8219, emoji: "🎺", description: "쿠바 음악의 동부 수도" },
          { name: "비냘레스", lat: 22.6192, lng: -83.4375, emoji: "🚬", description: "담배 농장과 카르스트 계곡" },
          { name: "시엔푸에고스", lat: 22.1443, lng: -80.4506, emoji: "🦞", description: "'남부 진주' 항구 도시" },
        ],
      },
      {
        name: "자메이카",
        flag: "🇯🇲",
        currency: "JMD",
        cities: [
          { name: "몬테고 베이", lat: 18.4762, lng: -77.8939, emoji: "🏖️", description: "리조트와 럼 펀치의 해변" },
          { name: "킹스턴", lat: 17.9712, lng: -76.7936, emoji: "🎧", description: "레게의 태생지 밥 말리 박물관" },
          { name: "오초 리오스", lat: 18.1786, lng: -76.9558, emoji: "💦", description: "던스 리버 폭포 등반" },
          { name: "네그릴", lat: 18.2688, lng: -78.345, emoji: "🌅", description: "7마일 비치의 환상적인 선셋" },
          { name: "포트 안토니오", lat: 18.1796, lng: -76.451, emoji: "🌿", description: "블루 라군의 무인 경관" },
          { name: "만데빌", lat: 18.0447, lng: -77.5031, emoji: "🍍", description: "산악 과수원의 시원한 고원 도시" },
        ],
      },
      {
        name: "코스타리카",
        flag: "🇨🇷",
        currency: "CRC",
        cities: [
          { name: "산호세", lat: 9.9281, lng: -84.0907, emoji: "🌋", description: "화산으로 둘러싸인 수도" },
          { name: "아레날", lat: 10.4667, lng: -84.7, emoji: "♨️", description: "화산 온천과 징글 보트" },
          { name: "마누엘 안토니오", lat: 9.3906, lng: -84.1389, emoji: "🐒", description: "국립공원 해변의 나원 낙원" },
          { name: "몬테베르데", lat: 10.3008, lng: -84.7901, emoji: "🕸️", description: "구름숲 짚라인 어드벤처" },
          { name: "타마린도", lat: 10.4583, lng: -85.8458, emoji: "🏄", description: "서핑과 거북 알 보기 해변" },
          { name: "푸에르토비에호", lat: 9.9553, lng: -82.6724, emoji: "🥥", description: "카리브 분위기의 게으른 마을" },
        ],
      },
      {
        name: "파나마",
        flag: "🇵🇦",
        currency: "PAB",
        cities: [
          { name: "파나마시티", lat: 8.9824, lng: -79.5199, emoji: "🚢", description: "운하와 스카이라인의 수도" },
          { name: "보케테", lat: 8.7667, lng: -82.4333, emoji: "☕", description: "커피 농장의 시원한 고원 마을" },
          { name: "산블라스", lat: 9.5597, lng: -78.9525, emoji: "🏝️", description: "쿠나족의 365개 섬 군도" },
          { name: "포르토벨로", lat: 9.3333, lng: -79.65, emoji: "🏴‍☠️", description: "해적 전설의 식민지 항구" },
          { name: "다리엔", lat: 8.2167, lng: -77.4333, emoji: "🐆", description: "정글 트레킹의 야생 보루" },
          { name: "엘발레", lat: 8.6167, lng: -80.1333, emoji: "🦜", description: "안토니 계곡의 화산 호수 마을" },
        ],
      },
      {
        name: "바하마",
        flag: "🇧🇸",
        currency: "BSD",
        cities: [
          { name: "나소", lat: 25.0443, lng: -77.3504, emoji: "🚢", description: "카지노와 항구 크루즈의 수도" },
          { name: "엑수마", lat: -24.6833, lng: 76.8333, emoji: "🐷", description: "수영하는 돼지와 썬더볼 그로토" },
          { name: "프리포트", lat: 26.5333, lng: -78.6957, emoji: "🐠", description: "세계에서 두 번째로 깊은 블루홀" },
          { name: "할버섬", lat: 25.7333, lng: -77.8, emoji: "🦈", description: "상어 다이빙의 모험 섬" },
          { name: "안다로스", lat: 24.5167, lng: -78.1, emoji: "🕳️", description: "세계 최대의 산호초 벽" },
          { name: "롱아일랜드", lat: 23.6333, lng: -75.3167, emoji: "🐚", description: "딘스 블루홀 다이빙 성지" },
        ],
      },
    ],
  },
  {
    id: "south-america",
    name: "남미",
    emoji: "🌴",
    countries: [
      {
        name: "브라질",
        flag: "🇧🇷",
        currency: "BRL",
        cities: [
          { name: "리우데자네이루", lat: -22.9068, lng: -43.1729, emoji: "⛰️", description: "코르코바도와 코파카바나" },
          { name: "상파울루", lat: -23.5505, lng: -46.6333, emoji: "🏙️", description: "거대한 미식과 예술의 메트로폴리스" },
          { name: "살바도르", lat: -12.9777, lng: -38.5016, emoji: "🥁", description: "아프로 브라질 문화의 구도시" },
          { name: "이구아수", lat: -25.6953, lng: -54.4367, emoji: "💧", description: "275개 폭포의 대협곡" },
          { name: "마나우스", lat: -3.119, lng: -60.0217, emoji: "🌳", description: "아마존 정글 탐험의 관문" },
          { name: "브루지우", lat: -23.1628, lng: -45.7113, emoji: "🖼️", description: "산속의 예술 마을" },
          { name: "플로리아노폴리스", lat: -27.5954, lng: -48.548, emoji: "🏄", description: "'마법의 섬' 서핑 해변" },
          { name: "포르투 알레그리", lat: -30.0346, lng: -51.2177, emoji: "🥩", description: "가우초 BBQ의 남부 도시" },
        ],
      },
      {
        name: "아르헨티나",
        flag: "🇦🇷",
        currency: "ARS",
        cities: [
          { name: "부에노스아이레스", lat: -34.6037, lng: -58.3816, emoji: "💃", description: "탱고와 스테이크의 파리 같은 도시" },
          { name: "우수아이아", lat: -54.8019, lng: -68.303, emoji: "🐧", description: "세계 끝, 남극 관문" },
          { name: "멘도사", lat: -32.8895, lng: -68.8458, emoji: "🍇", description: "안데스 발치 와인 농장" },
          { name: "이구아수 (아르헨)", lat: -25.6167, lng: -54.5833, emoji: "🌈", description: "악마의 목구멍 최고 전망" },
          { name: "바릴로체", lat: -41.1335, lng: -71.3103, emoji: "🍫", description: "호수와 초콜릿의 알프스 마을" },
          { name: "엘칼라파테", lat: -50.3406, lng: -72.2656, emoji: "🧊", description: "페리토 모레노 빙하 관문" },
          { name: "코르도바", lat: -31.4201, lng: -64.1888, emoji: "⛪", description: "예수회 유산의 산간 도시" },
        ],
      },
      {
        name: "칠레",
        flag: "🇨🇱",
        currency: "CLP",
        cities: [
          { name: "산티아고", lat: -33.4489, lng: -70.6693, emoji: "🗻", description: "안데스가 내려다보이는 수도" },
          { name: "발파라이소", lat: -33.0472, lng: -71.6127, emoji: "🎨", description: "언덕 위 벽화의 항구 도시" },
          { name: "산페드로 데 아타카마", lat: -22.9149, lng: -68.2003, emoji: "🏜️", description: "달의 계곡과 간헐천 사막" },
          { name: "이스터섬", lat: -27.1127, lng: -109.3497, emoji: "🗿", description: "모아이 석상의 신비로운 섬" },
          { name: "푸에르토 나탈레스", lat: -51.7301, lng: -72.5008, emoji: "🥾", description: "토레스 델 파이네 관문" },
          { name: "빈야 델 마르", lat: -33.0245, lng: -71.5519, emoji: "🌸", description: "정원과 해변의 리조트 도시" },
          { name: "칠로에", lat: -42.4789, lng: -73.7605, emoji: "🏠", description: "색색의 교회와 통나무 집 섬" },
        ],
      },
      {
        name: "페루",
        flag: "🇵🇪",
        currency: "PEN",
        cities: [
          { name: "쿠스코", lat: -13.5319, lng: -71.9675, emoji: "🦙", description: "잉카 제국의 수도, 마추픽추 관문" },
          { name: "리마", lat: -12.0464, lng: -77.0428, emoji: "🥂", description: "세계적 미식 도시" },
          { name: "아레키파", lat: -16.409, lng: -71.5375, emoji: "🦅", description: "흰 화산악 도시와 콜카 협곡" },
          { name: "나스카", lat: -14.8283, lng: -74.9375, emoji: "✏️", description: "대지에 그려진 신비한 지상 그림" },
          { name: "푸노", lat: -15.8402, lng: -70.0219, emoji: "🛶", description: "티티카카 호수의 떠 있는 섬" },
          { name: "이키토스", lat: -3.7437, lng: -73.2516, emoji: "🐊", description: "아마존 강변의 정글 도시" },
          { name: "우아라스", lat: -9.5278, lng: -77.5278, emoji: "🏔️", description: "와라스 산맥 트레킹 베이스" },
        ],
      },
      {
        name: "콜롬비아",
        flag: "🇨🇴",
        currency: "COP",
        cities: [
          { name: "카르타헤나", lat: 10.391, lng: -75.4794, emoji: "🏰", description: "카리브 성벽 도시의 낭만" },
          { name: "보고타", lat: 4.711, lng: -74.0721, emoji: "🖼️", description: "고원의 예술과 골드 박물관" },
          { name: "메데진", lat: 6.2442, lng: -75.5812, emoji: "💐", description: "영원한 봄의 도시" },
          { name: "카리", lat: 3.4516, lng: -76.532, emoji: "🕺", description: "살사의 세계 수도" },
          { name: "테이론나", lat: 11.2408, lng: -74.0693, emoji: "🏕️", description: "정글 해변 국립공원 트레킹" },
          { name: "산타 마르타", lat: 11.2408, lng: -74.2109, emoji: "⛵", description: "카리브 최오래된 항구" },
          { name: "산 안드레스", lat: 12.5833, lng: -81.7167, emoji: "🩵", description: "'바다 7색'의 섬" },
        ],
      },
      {
        name: "볼리비아",
        flag: "🇧🇴",
        currency: "BOB",
        cities: [
          { name: "라파스", lat: -16.4897, lng: -68.1193, emoji: "🚡", description: "케이블카가 오가는 고원 수도" },
          { name: "우유니", lat: -20.4589, lng: -66.8342, emoji: "🪞", description: "세계 최대의 하늘을 비추는 소금 사막" },
          { name: "수크레", lat: -19.0196, lng: -65.2607, emoji: "🏛️", description: "하얀 벽의 법정 수도" },
          { name: "코파카바나 (볼)", lat: -16.1667, lng: -68.8167, emoji: "⛴️", description: "티티카카 호수 기슭의 성지" },
          { name: "포토시", lat: -19.5833, lng: -65.75, emoji: "⛏️", description: "은광산의 고산 유적 도시" },
          { name: "사마 파타", lat: -18.1167, lng: -63.6, emoji: "🦖", description: "공룡 발자국 화석 공원" },
        ],
      },
      {
        name: "우루과이",
        flag: "🇺🇾",
        currency: "UYU",
        cities: [
          { name: "몬테비데오", lat: -34.9011, lng: -56.1645, emoji: "🚗", description: "느긋한 람블라 항구 수도" },
          { name: "푼타 델 에스테", lat: -34.9667, lng: -54.95, emoji: "🏖️", description: "남미의 몬테카를로 리조트" },
          { name: "콜로니아", lat: -34.4719, lng: -57.8478, emoji: "🕰️", description: "포르투갈 유산의 강가 유적 마을" },
          { name: "카르멜로", lat: -34.0006, lng: -58.2906, emoji: "🍇", description: "타나트 와인 농장의 강변 마을" },
          { name: "호세 이그나시오", lat: -34.8333, lng: -54.6333, emoji: "🌅", description: "조용한 상류 해변 마을" },
          { name: "살토", lat: -31.3833, lng: -57.9667, emoji: "♨️", description: "우루과이 강변 온천 도시" },
        ],
      },
      {
        name: "에콰도르",
        flag: "🇪🇨",
        currency: "USD",
        cities: [
          { name: "키토", lat: -0.1807, lng: -78.4678, emoji: "⛪", description: "적도 위의 콜로니얼 수도" },
          { name: "갈라파고스", lat: -0.7437, lng: -90.3161, emoji: "🐢", description: "다윈의 야생동물 천국" },
          { name: "쿠엥카", lat: -2.9001, lng: -79.0059, emoji: "👒", description: "파나마 모자의 하얀 도시" },
          { name: "바뇨스", lat: -1.3937, lng: -78.4269, emoji: "🧗", description: "화산 발치의 액티비티 마을" },
          { name: "과야킬", lat: -2.1894, lng: -79.8891, emoji: "🦎", description: "열대 항구의 이과나 공원" },
          { name: "오타발로", lat: 0.2314, lng: -78.3639, emoji: "🧶", description: "원주민 직물 시장의 마을" },
        ],
      },
    ],
  },
  {
    id: "africa",
    name: "아프리카",
    emoji: "🦁",
    countries: [
      {
        name: "이집트",
        flag: "🇪🇬",
        currency: "EGP",
        cities: [
          { name: "카이로", lat: 30.0444, lng: 31.2357, emoji: "🔺", description: "기자 피라미드와 나일 강의 수도" },
          { name: "룩소르", lat: 25.6872, lng: 32.6396, emoji: "🏛️", description: "카르낙 신전과 왕가의 계곡" },
          { name: "아스완", lat: 24.0889, lng: 32.8998, emoji: "⛵", description: "필레 신전과 펠루카 항해" },
          { name: "후르가다", lat: 27.2579, lng: 33.8116, emoji: "🐟", description: "홍해 스노클링 리조트" },
          { name: "샤름엘셰이크", lat: 27.9158, lng: 34.3299, emoji: "🤿", description: "세계급 다이빙 포인트" },
          { name: "알렉산드리아", lat: 31.2001, lng: 29.9187, emoji: "📚", description: "고대 도서관의 지중해 도시" },
        ],
      },
      {
        name: "모로코",
        flag: "🇲🇦",
        currency: "MAD",
        cities: [
          { name: "마라케시", lat: 31.6295, lng: -7.9811, emoji: "🕌", description: "쟈마 엘프나 광장의 붉은 도시" },
          { name: "카사블랑카", lat: 33.5731, lng: -7.5898, emoji: "🌊", description: "하산 2세 모스크의 항구 도시" },
          { name: "페즈", lat: 34.0331, lng: -5.0003, emoji: "🧭", description: "미로 같은 최대 메디나" },
          { name: "셰프샤우엔", lat: 35.1688, lng: -5.2636, emoji: "💙", description: "산속 파란 마을" },
          { name: "메르조가", lat: 31.0803, lng: -4.0134, emoji: "🐫", description: "사하라 사구 캠프의 관문" },
          { name: "에사우이라", lat: 31.5085, lng: -9.7595, emoji: "🪁", description: "바람의 도시, 윈드서핑 성지" },
          { name: "라바트", lat: 34.0209, lng: -6.8416, emoji: "🏛️", description: "대서양 연안의 수도" },
        ],
      },
      {
        name: "남아프리카공화국",
        flag: "🇿🇦",
        currency: "ZAR",
        cities: [
          { name: "케이프타운", lat: -33.9249, lng: 18.4241, emoji: "⛰️", description: "테이블 마운틴과 케이프 포인트" },
          { name: "요하네스버그", lat: -26.2041, lng: 28.0473, emoji: "⛏️", description: "황금 도시의 역사와 재생" },
          { name: "더반", lat: -29.8587, lng: 31.0218, emoji: "🏄", description: "인도양 골든 마일 해변" },
          { name: "크루거", lat: -24.0043, lng: 31.1063, emoji: "🦁", description: "빅파이브 사파리 국립공원" },
          { name: "스텔렌보스", lat: -33.9321, lng: 18.8602, emoji: "🍷", description: "케이프 와인랜드 대학 도시" },
          { name: "허마누스", lat: -34.4187, lng: 19.2345, emoji: "🐋", description: "고래 관찰의 세계 수도" },
          { name: "프리토리아", lat: -25.7479, lng: 28.2293, emoji: "🌺", description: "자카란다 꽃의 행정 수도" },
        ],
      },
      {
        name: "케냐",
        flag: "🇰🇪",
        currency: "KES",
        cities: [
          { name: "나이로비", lat: -1.2921, lng: 36.8219, emoji: "🦒", description: "도심 속 사파리 수도" },
          { name: "마사이마라", lat: -1.4931, lng: 35.1439, emoji: "🦓", description: "대이동의 사바나" },
          { name: "암보셀리", lat: -2.6469, lng: 37.2561, emoji: "🐘", description: "킬리만자로 배경 코끼리 군락" },
          { name: "디아니 비치", lat: -4.2803, lng: 39.5898, emoji: "🌴", description: "인도양 백사장 리조트" },
          { name: "나쿠루", lat: -0.3031, lng: 36.08, emoji: "🦩", description: "플라밍고 호수 국립공원" },
          { name: "람루", lat: -2.2708, lng: 40.902, emoji: "🌙", description: "스와힐리 문화의 섬 마을" },
        ],
      },
      {
        name: "탄자니아",
        flag: "🇹🇿",
        currency: "TZS",
        cities: [
          { name: "아루샤", lat: -3.3869, lng: 36.683, emoji: "🦁", description: "세렝게티 사파리 관문" },
          { name: "잔지바르", lat: -6.1659, lng: 39.2026, emoji: "🏝️", description: "향료와 백사장의 섬" },
          { name: "다르에스살람", lat: -6.7924, lng: 39.2083, emoji: "⚓", description: "인도양 항구의 경제 수도" },
          { name: "세렝게티", lat: -2.3333, lng: 34.8333, emoji: "🐆", description: "세계 최대 야생동물 이주" },
          { name: "킬리만자로", lat: -3.0674, lng: 37.3556, emoji: "🗻", description: "아프리카 최고봉 등반" },
          { name: "응고롱고로", lat: -3.1667, lng: 35.5, emoji: "🦏", description: "화산 분화구 자연 사육장" },
        ],
      },
      {
        name: "튀니지",
        flag: "🇹🇳",
        currency: "TND",
        cities: [
          { name: "튀니스", lat: 36.8065, lng: 10.1815, emoji: "🏛️", description: "카르타고와 메디나의 수도" },
          { name: "시디부사이드", lat: 36.8404, lng: 10.3503, emoji: "🔵", description: "파란 흰 마을" },
          { name: "수스", lat: 35.8256, lng: 10.6412, emoji: "🏖️", description: "지중해 휴양지 '사우스의 진주'" },
          { name: "엘젬", lat: 35.2942, lng: 10.7081, emoji: "🏟️", description: "콜로세움보 큰 원형극장" },
          { name: "두즈", lat: 33.4661, lng: 9.0203, emoji: "🐪", description: "사하라 관문의 낙타 도시" },
          { name: "타바르카", lat: 36.5733, lng: 8.7558, emoji: "🪸", description: "산호와 재즈 페스티벌 해안" },
        ],
      },
      {
        name: "나미비아",
        flag: "🇳🇦",
        currency: "NAD",
        cities: [
          { name: "윈드후크", lat: -22.5597, lng: 17.0832, emoji: "🏗️", description: "독일풍 건축의 수도" },
          { name: "소수스플레이", lat: -24.6167, lng: 15.2833, emoji: "🏜️", description: "붉은 사구와 데드블레이" },
          { name: "스와코프문트", lat: -22.9575, lng: 14.5053, emoji: "🦭", description: "대서양 물개 항구 도시" },
          { name: "에토샤", lat: -18.8, lng: 16.9333, emoji: "🦒", description: "염전 동물원 국립공원" },
          { name: "다마랄란드", lat: -20.4167, lng: 14.5, emoji: "⛰️", description: "스피츠코페 화산암 지대" },
          { name: "카프리비", lat: -17.8333, lng: 23.2, emoji: "🦛", description: "강변 사파리 회랑" },
        ],
      },
      {
        name: "세이셸",
        flag: "🇸🇨",
        currency: "SCR",
        cities: [
          { name: "빅토리아", lat: -4.6191, lng: 55.4513, emoji: "🕰️", description: "작은 시계탑의 섬 수도" },
          { name: "마에", lat: -4.6167, lng: 55.45, emoji: "🏝️", description: "그라니트 해변의 본섬" },
          { name: "프라슬린", lat: -4.3167, lng: 55.7333, emoji: "🌰", description: "코코 드 메르 야자수의 섬" },
          { name: "라 디그", lat: -4.3667, lng: 55.8333, emoji: "🐂", description: "황소 수레가 달리는 느긋한 섬" },
          { name: "라 디그 은빛 해변", lat: -4.35, lng: 55.8333, emoji: "📸", description: "세계 최고 해변 소스 다르장" },
          { name: "실루엣", lat: -4.4833, lng: 55.4, emoji: "🌿", description: "정글 산악의 무인 섬 리조트" },
        ],
      },
    ],
  },
  {
    id: "oceania",
    name: "오세아니아",
    emoji: "🐨",
    countries: [
      {
        name: "호주",
        flag: "🇦🇺",
        currency: "AUD",
        cities: [
          { name: "시드니", lat: -33.8688, lng: 151.2093, emoji: "🎭", description: "오페라하우스와 하버 브리지" },
          { name: "멜버른", lat: -37.8136, lng: 144.9631, emoji: "☕", description: "커피와 골목 예술의 도시" },
          { name: "케언즈", lat: -16.9186, lng: 145.7781, emoji: "🐠", description: "그레이트 배리어 리프 관문" },
          { name: "골드코스트", lat: -28.0167, lng: 153.4, emoji: "🏄", description: "서핑과 테마파크의 해변" },
          { name: "퍼스", lat: -31.9505, lng: 115.8605, emoji: "🦘", description: "세계에서 가장 고립된 도시" },
          { name: "울루루", lat: -25.3444, lng: 131.0369, emoji: "🪨", description: "붉은 중심부의 거대 모노리스" },
          { name: "브리즈번", lat: -27.4698, lng: 153.0251, emoji: "🌞", description: "선샤인 스테이트의 수도" },
          { name: "애들레이드", lat: -34.9285, lng: 138.6007, emoji: "🍇", description: "바로사 밸리 와인 관문" },
        ],
      },
      {
        name: "뉴질랜드",
        flag: "🇳🇿",
        currency: "NZD",
        cities: [
          { name: "오클랜드", lat: -36.8509, lng: 174.7645, emoji: "⛵", description: "돛단배의 도시" },
          { name: "퀸스타운", lat: -45.0312, lng: 168.6626, emoji: "🪂", description: "번지점프의 태생지, 어드벤처 수도" },
          { name: "로토루아", lat: -38.1368, lng: 176.2497, emoji: "♨️", description: "간헐천과 마오리 문화" },
          { name: "밀포드 사운드", lat: -44.6731, lng: 167.9247, emoji: "🛳️", description: "세계 유산 피오르드 크루즈" },
          { name: "웰링턴", lat: -41.2866, lng: 174.7756, emoji: "🎬", description: "반지의 제왕의 수도" },
          { name: "크라이스트처치", lat: -43.5321, lng: 172.6362, emoji: "🌷", description: "가든 시티의 재생 도시" },
          { name: "호비튼", lat: -37.8721, lng: 175.6801, emoji: "🚪", description: "호빗 마을 세트장" },
          { name: "와나카", lat: -44.7031, lng: 169.15, emoji: "🌲", description: "고립된 나무의 호수 마을" },
        ],
      },
      {
        name: "피지",
        flag: "🇫🇯",
        currency: "FJD",
        cities: [
          { name: "나디", lat: -17.7765, lng: 177.4356, emoji: "🌺", description: "리조트 섬 관문의 항구" },
          { name: "수바", lat: -18.1248, lng: 178.4501, emoji: "🏛️", description: "남태평양의 수도" },
          { name: "마마누카", lat: -17.7167, lng: 177.2, emoji: "🏝️", description: "무인 섬 호핑 군도" },
          { name: "타베우니", lat: -16.8053, lng: 179.8847, emoji: "🌼", description: "'가든 아일랜드' 폭포 섬" },
          { name: "코랄 코스트", lat: -18.1833, lng: 177.7667, emoji: "🌊", description: "서핑과 시그아토카 협곡" },
          { name: "야사와", lat: -16.8333, lng: 177.4167, emoji: "🌅", description: "블루 라군의 원시 군도" },
        ],
      },
      {
        name: "괌",
        flag: "🇬🇺",
        currency: "USD",
        cities: [
          { name: "투몬", lat: 13.5204, lng: 144.8053, emoji: "🏖️", description: "호텔 스트립의 투몬 베이" },
          { name: "타밍", lat: 13.3873, lng: 144.6869, emoji: "🛍️", description: "프리미엄 아울렛의 쇼핑 도시" },
          { name: "하갓나", lat: 13.4744, lng: 144.7497, emoji: "🏛️", description: "스패니시 플라자의 수도" },
          { name: "톨레도", lat: 13.3883, lng: 144.7053, emoji: "⛰️", description: "타로포포 폭포 정글" },
          { name: "요나", lat: 13.5333, lng: 144.7667, emoji: "🪞", description: "투만 베이 전망의 절벽" },
          { name: "이파오", lat: 13.5167, lng: 144.8, emoji: "🐠", description: "이파오 비치 파크의 얕은 물" },
        ],
      },
      {
        name: "사이판",
        flag: "🇲🇵",
        currency: "USD",
        cities: [
          { name: "가라판", lat: 15.1855, lng: 145.7539, emoji: "🏬", description: "DFS와 마켓의 중심가" },
          { name: "만가하", lat: 15.2633, lng: 145.7833, emoji: "🪨", description: "만게하 절벽과 버드아일랜드" },
          { name: "수페", lat: 15.1522, lng: 145.7211, emoji: "⛰️", description: "타포차우 산 등산로" },
          { name: "차란카노아", lat: 15.1408, lng: 145.7556, emoji: "🏖️", description: "마이크로 비치 리조트" },
          { name: "산호해변", lat: 15.1756, lng: 145.7239, emoji: "🤿", description: "Obyan 다이빙 포인트" },
          { name: "라우라베이", lat: 15.1172, lng: 145.7883, emoji: "🦀", description: "망고 마을의 조용한 해변" },
        ],
      },
      {
        name: "팔라우",
        flag: "🇵🇼",
        currency: "USD",
        cities: [
          { name: "코로르", lat: 7.3419, lng: 134.4792, emoji: "🐠", description: "록 아일랜드 관문의 도시" },
          { name: "말랙칼", lat: 7.4944, lng: 134.6344, emoji: "🛶", description: "전통 바이(카누)의 섬" },
          { name: "제리 허베이", lat: 7.3, lng: 134.4667, emoji: "🪼", description: "무해한 해파리 호수" },
          { name: "펠렐리우", lat: 6.9933, lng: 134.245, emoji: "⚔️", description: "2차대전 유적의 남쪽 섬" },
          { name: "앙가우르", lat: 6.9167, lng: 134.1167, emoji: "🐄", description: "소들이 풀뜰 하는 조용한 섬" },
          { name: "바벨다오프", lat: 7.5333, lng: 134.5833, emoji: "🌿", description: "정글과 폭포의 최대 섬" },
        ],
      },
      {
        name: "프랑스령 폴리네시아",
        flag: "🇵🇫",
        currency: "XPF",
        cities: [
          { name: "파페에테", lat: -17.5347, lng: -149.5585, emoji: "🌺", description: "타히티의 활기찬 항구 수도" },
          { name: "보라보라", lat: -16.5004, lng: -151.7415, emoji: "🏨", description: "워터 빌라의 세계적 휴양 섬" },
          { name: "모레아", lat: -17.5333, lng: -149.8333, emoji: "⛰️", description: "타히티 옆의 에메랄드 만" },
          { name: "후아힌 (폴리네시아)", lat: -16.7333, lng: -151.0, emoji: "🦈", description: "상어 입 라군의 조용한 섬" },
          { name: "랑기로아", lat: -14.9833, lng: -147.65, emoji: "🤿", description: "세계 최대 환초 다이빙" },
          { name: "티케하우", lat: -15.0667, lng: -148.2667, emoji: "🩵", description: "'하늘이 내려앉은 섬'" },
        ],
      },
      {
        name: "파푸아뉴기니",
        flag: "🇵🇬",
        currency: "PGK",
        cities: [
          { name: "포트모르즈비", lat: -9.4438, lng: 147.1803, emoji: "🏛️", description: "국회 의사당의 수도" },
          { name: "라바울", lat: -4.1983, lng: 152.1636, emoji: "🌋", description: "화산만의 다이빙 도시" },
          { name: "고로카", lat: -6.0833, lng: 145.3833, emoji: "🎭", description: "부족 축제의 고원 도시" },
          { name: "마당", lat: -5.2167, lng: 145.7833, emoji: "🦅", description: "새의 낙원 관람지" },
          { name: "세픽", lat: -3.3, lng: 143.1667, emoji: "🛶", description: "세픽 강 카누 탐험" },
          { name: "트루브리안드", lat: -8.6667, lng: 150.9167, emoji: "🐚", description: "쿨라 교환 문화의 군도" },
        ],
      },
    ],
  },
  {
    id: "middle-east",
    name: "중동",
    emoji: "🏜️",
    countries: [
      {
        name: "아랍에미리트",
        flag: "🇦🇪",
        currency: "AED",
        cities: [
          { name: "두바이", lat: 25.2048, lng: 55.2708, emoji: "🏙️", description: "부르즈 할리파의 미래 도시" },
          { name: "아부다비", lat: 24.4539, lng: 54.3773, emoji: "🕌", description: "셰이크 자예드 모스크의 수도" },
          { name: "샤르자", lat: 25.3463, lng: 55.4209, emoji: "🎨", description: "문화 수도, 박물관의 도시" },
          { name: "라스알카이마", lat: 25.7895, lng: 55.9432, emoji: "⛰️", description: "하자르 산맥과 사막 어드벤처" },
          { name: "후자이라", lat: 25.1288, lng: 56.3265, emoji: "🌊", description: "스노클링과 스쿠바의 동부 해안" },
          { name: "두바이 사막", lat: 24.8, lng: 55.5333, emoji: "🐪", description: "사막 사파리와 베두인 캠프" },
        ],
      },
      {
        name: "터키",
        flag: "🇹🇷",
        currency: "TRY",
        cities: [
          { name: "이스탄불", lat: 41.0082, lng: 28.9784, emoji: "🕌", description: "아시아와 유럽이 만나는 대도시" },
          { name: "카파도키아", lat: 38.6431, lng: 34.8286, emoji: "🎈", description: "열기구와 동굴 호텔" },
          { name: "안탈리아", lat: 36.8969, lng: 30.7133, emoji: "🏖️", description: "청록 해안의 리비에라" },
          { name: "파묵칼레", lat: 37.9137, lng: 29.1187, emoji: "🤍", description: "석회암 온천의 하얀 계단" },
          { name: "이즈미르", lat: 38.4192, lng: 27.1287, emoji: "⚓", description: "에페소스 관문의 에게 항구" },
          { name: "트라부존", lat: 41.0027, lng: 39.7168, emoji: "⛪", description: "수메라 수도원의 흑해 도시" },
          { name: "앙카라", lat: 39.9334, lng: 32.8597, emoji: "🏛️", description: "아타튀르크 영묘의 수도" },
          { name: "보드룸", lat: 37.0333, lng: 27.4333, emoji: "⛵", description: "요트 항해의 휴양 항구" },
        ],
      },
      {
        name: "사우디아라비아",
        flag: "🇸🇦",
        currency: "SAR",
        cities: [
          { name: "리야드", lat: 24.7136, lng: 46.6753, emoji: "🏙️", description: "사막의 현대적 수도" },
          { name: "제다", lat: 21.4858, lng: 39.1925, emoji: "🌊", description: "홍해 관문, 알발라드 구시가지" },
          { name: "메카", lat: 21.3891, lng: 39.8579, emoji: "🕋", description: "이슬람의 성지" },
          { name: "메디나", lat: 24.5247, lng: 39.5692, emoji: "🕌", description: "예언자의 도시" },
          { name: "알울라", lat: 26.6333, lng: 37.9667, emoji: "🗿", description: "헤그라 고대 무역 도시" },
          { name: "다란", lat: 26.2361, lng: 50.0393, emoji: "🛢️", description: "석유의 수도, 동부 해안" },
        ],
      },
      {
        name: "카타르",
        flag: "🇶🇦",
        currency: "QAR",
        cities: [
          { name: "도하", lat: 25.2854, lng: 51.531, emoji: "🏙️", description: "웨스트 베이 스카이라인의 수도" },
          { name: "수크 와키프", lat: 25.2903, lng: 51.5333, emoji: "🏮", description: "향신료 전통 시장" },
          { name: "카타라", lat: 25.3208, lng: 51.5308, emoji: "🎭", description: "문화 마을과 해변 극장" },
          { name: "칼리프 해변", lat: 24.9833, lng: 51.0167, emoji: "🏜️", description: "사막이 바다에 닿는 내륀 해변" },
          { name: "알 와크라", lat: 25.1717, lng: 51.6031, emoji: "🦩", description: "플라밍고 습지의 남부 도시" },
          { name: "루사일", lat: 25.4306, lng: 51.4917, emoji: "🎡", description: "루사일 워터프론트 신도시" },
        ],
      },
      {
        name: "이스라엘",
        flag: "🇮🇱",
        currency: "ILS",
        cities: [
          { name: "예루살렘", lat: 31.7683, lng: 35.2137, emoji: "🕍", description: "3대 종교의 성지" },
          { name: "텔아비브", lat: 32.0853, lng: 34.7818, emoji: "🏖️", description: "바우하우스 해변의 현대 도시" },
          { name: "사해", lat: 31.5, lng: 35.4732, emoji: "🧂", description: "세계 최저점 부유 체험" },
          { name: "하이파", lat: 32.794, lng: 34.9896, emoji: "🌺", description: "바하이 계단 정원의 항구" },
          { name: "에일라트", lat: 29.5577, lng: 34.9519, emoji: "🐠", description: "홍해 최남단 리조트" },
          { name: "나사렛", lat: 32.6996, lng: 35.3035, emoji: "⛪", description: "성모 수태의 갈릴리 도시" },
        ],
      },
      {
        name: "요르단",
        flag: "🇯🇴",
        currency: "JOD",
        cities: [
          { name: "암만", lat: 31.9454, lng: 35.9284, emoji: "🏛️", description: "7개 언덕 위의 수도" },
          { name: "페트라", lat: 30.3285, lng: 35.4444, emoji: "🏜️", description: "장미빛 절벽의 고대 도시" },
          { name: "와디럼", lat: 29.5732, lng: 35.4207, emoji: "🌕", description: "화성 같은 붉은 사막" },
          { name: "아카바", lat: 29.5321, lng: 35.0063, emoji: "🤿", description: "홍해 다이빙 항구" },
          { name: "제라시", lat: 32.2811, lng: 35.8992, emoji: "🏟️", description: "로마 유적의 완벽한 도시" },
          { name: "마답", lat: 31.0833, lng: 35.5833, emoji: "🗺️", description: "모자이크 지도의 성지 마을" },
        ],
      },
      {
        name: "오만",
        flag: "🇴🇲",
        currency: "OMR",
        cities: [
          { name: "무스카트", lat: 23.588, lng: 58.3829, emoji: "🕌", description: "술탄 카부스 모스크의 수도" },
          { name: "살랄라", lat: 17.0151, lng: 54.0924, emoji: "🌧️", description: "여름 몬순 카리프의 남부 도시" },
          { name: "니즈와", lat: 22.9333, lng: 57.5333, emoji: "🏰", description: "니즈와 요새의 고대 수도" },
          { name: "수르", lat: 22.5667, lng: 59.5289, emoji: "⛵", description: "전통 돔보이선 조선 항구" },
          { name: "와히바 사막", lat: 22.3, lng: 58.7, emoji: "🐪", description: "황금 사구 베두인 캠프" },
          { name: "무산담", lat: 26.1833, lng: 56.2333, emoji: "⛰️", description: "'아라비아 피오르드' 반도" },
        ],
      },
      {
        name: "바레인",
        flag: "🇧🇭",
        currency: "BHD",
        cities: [
          { name: "마나마", lat: 26.2285, lng: 50.586, emoji: "🏙️", description: "펄 라운드어바웃의 수도" },
          { name: "무하라크", lat: 26.2572, lng: 50.6119, emoji: "🐚", description: "진주 채집 유산의 구시가지" },
          { name: "리파", lat: 26.13, lng: 50.505, emoji: "🕌", description: "모스크와 요새의 남부 도시" },
          { name: "바르바르", lat: 26.2183, lng: 50.5456, emoji: "⛲", description: "디루문 문명 신전 유적" },
          { name: "트리 오뜨 사막", lat: 25.9833, lng: 50.5333, emoji: "🌵", description: "사막 나무의 신비로운 샘" },
          { name: "아므와즈", lat: 26.2333, lng: 50.5833, emoji: "🎣", description: "전통 어촌의 페리 섬" },
        ],
      },
    ],
  },
];

/** 검색용: 모든 국가/도시를 하나의 리스트로 평탄화 */
export function searchDestinations(query: string): DestinationSelection[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: DestinationSelection[] = [];
  for (const continent of WORLD) {
    for (const country of continent.countries) {
      const countryMatch = country.name.toLowerCase().includes(q);
      for (const city of country.cities) {
        if (
          countryMatch ||
          city.name.toLowerCase().includes(q) ||
          city.description.includes(query.trim())
        ) {
          results.push({ continent, country, city });
        }
      }
    }
  }
  return results;
}
