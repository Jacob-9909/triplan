/** 나라별 현지 정보. 출발 전 외교부 해외안전여행(0404.go.kr)에서 한 번 더 확인하라고 안내한다 */
export interface CountryInfo {
  /** IANA 시간대 (대표 도시) */
  tz: string;
  /** 콘센트 모양 (A·C 등) */
  plugs: string;
  volt: string;
  /** 긴급 전화 */
  sos: string;
  tip: string;
}

const EU = { plugs: "C·F", volt: "230V", sos: "112" };

export const COUNTRY_INFO: Record<string, CountryInfo> = {
  일본: { tz: "Asia/Tokyo", plugs: "A·B", volt: "100V", sos: "경찰 110 · 구급·소방 119", tip: "팁 문화 없음" },
  대한민국: { tz: "Asia/Seoul", plugs: "C·F", volt: "220V", sos: "경찰 112 · 구급·소방 119", tip: "팁 문화 없음" },
  중국: { tz: "Asia/Shanghai", plugs: "A·C·I", volt: "220V", sos: "경찰 110 · 구급 120 · 소방 119", tip: "팁 문화 없음" },
  태국: { tz: "Asia/Bangkok", plugs: "A·B·C·O", volt: "220V", sos: "관광경찰 1155 · 경찰 191 · 구급 1669", tip: "잔돈 정도 (20~50바트)" },
  베트남: { tz: "Asia/Ho_Chi_Minh", plugs: "A·C·F", volt: "220V", sos: "경찰 113 · 소방 114 · 구급 115", tip: "필수 아님, 마사지·투어는 잔돈 정도" },
  싱가포르: { tz: "Asia/Singapore", plugs: "G", volt: "230V", sos: "경찰 999 · 구급·소방 995", tip: "필요 없음 (봉사료 10% 포함)" },
  대만: { tz: "Asia/Taipei", plugs: "A·B", volt: "110V", sos: "경찰 110 · 구급·소방 119", tip: "필요 없음 (식당 봉사료 10%)" },
  인도네시아: { tz: "Asia/Jakarta", plugs: "C·F", volt: "230V", sos: "통합 112 · 경찰 110 · 구급 118", tip: "봉사료 포함이 많음, 가이드·기사는 따로" },
  말레이시아: { tz: "Asia/Kuala_Lumpur", plugs: "G", volt: "240V", sos: "999", tip: "필요 없음 (봉사료 10% 포함)" },
  필리핀: { tz: "Asia/Manila", plugs: "A·B·C", volt: "220V", sos: "911", tip: "봉사료 없으면 10% 정도" },

  프랑스: { tz: "Europe/Paris", ...EU, plugs: "C·E", tip: "봉사료 포함, 잔돈 정도" },
  이탈리아: { tz: "Europe/Rome", ...EU, plugs: "C·F·L", tip: "자릿세(코페르토) 별도, 팁은 선택" },
  스페인: { tz: "Europe/Madrid", ...EU, tip: "선택 (5~10%)" },
  독일: { tz: "Europe/Berlin", ...EU, tip: "5~10% 반올림" },
  영국: { tz: "Europe/London", plugs: "G", volt: "230V", sos: "999 · 112", tip: "10~12.5% (봉사료 포함인지 확인)" },
  스위스: { tz: "Europe/Zurich", ...EU, plugs: "C·J", tip: "포함, 반올림 정도" },
  네덜란드: { tz: "Europe/Amsterdam", ...EU, tip: "선택 (5~10%)" },
  오스트리아: { tz: "Europe/Vienna", ...EU, tip: "5~10% 반올림" },
  체코: { tz: "Europe/Prague", ...EU, plugs: "C·E", tip: "10% 정도" },
  포르투갈: { tz: "Europe/Lisbon", ...EU, tip: "선택 (5~10%)" },
  그리스: { tz: "Europe/Athens", ...EU, tip: "5~10%" },
  헝가리: { tz: "Europe/Budapest", ...EU, tip: "10~15% (봉사료 포함인지 확인)" },

  미국: { tz: "America/New_York", plugs: "A·B", volt: "120V", sos: "911", tip: "식당 18~20%, 택시 15%" },
  캐나다: { tz: "America/Toronto", plugs: "A·B", volt: "120V", sos: "911", tip: "식당 15~20%" },
  멕시코: { tz: "America/Mexico_City", plugs: "A·B", volt: "127V", sos: "911", tip: "10~15%" },
  쿠바: { tz: "America/Havana", plugs: "A·B·C", volt: "110V/220V", sos: "경찰 106 · 구급 104", tip: "10%" },
  자메이카: { tz: "America/Jamaica", plugs: "A·B", volt: "110V", sos: "경찰 119 · 구급·소방 110", tip: "10~15%" },
  코스타리카: { tz: "America/Costa_Rica", plugs: "A·B", volt: "120V", sos: "911", tip: "봉사료 10% 포함" },
  파나마: { tz: "America/Panama", plugs: "A·B", volt: "120V", sos: "911", tip: "10%" },
  바하마: { tz: "America/Nassau", plugs: "A·B", volt: "120V", sos: "911", tip: "15% (포함인지 확인)" },

  브라질: { tz: "America/Sao_Paulo", plugs: "C·N", volt: "127V/220V", sos: "경찰 190 · 구급 192 · 소방 193", tip: "봉사료 10% 포함" },
  아르헨티나: { tz: "America/Argentina/Buenos_Aires", plugs: "C·I", volt: "220V", sos: "911 · 구급 107", tip: "10%" },
  칠레: { tz: "America/Santiago", plugs: "C·L", volt: "220V", sos: "경찰 133 · 구급 131", tip: "10% (계산서에 권장액)" },
  페루: { tz: "America/Lima", plugs: "A·C", volt: "220V", sos: "경찰 105 · 구급 106", tip: "10%" },
  콜롬비아: { tz: "America/Bogota", plugs: "A·B", volt: "110V", sos: "123", tip: "봉사료 10% 권장(선택)" },
  볼리비아: { tz: "America/La_Paz", plugs: "A·C", volt: "230V", sos: "경찰 110 · 구급 118", tip: "10%" },
  우루과이: { tz: "America/Montevideo", plugs: "C·F·L", volt: "220V", sos: "911", tip: "10%" },
  에콰도르: { tz: "America/Guayaquil", plugs: "A·B", volt: "120V", sos: "911", tip: "봉사료 10% 포함" },

  이집트: { tz: "Africa/Cairo", plugs: "C·F", volt: "220V", sos: "관광경찰 126 · 경찰 122 · 구급 123", tip: "팁(박시시) 문화 강함, 10~15%" },
  모로코: { tz: "Africa/Casablanca", plugs: "C·E", volt: "220V", sos: "경찰 19 · 구급 15", tip: "10%" },
  남아프리카공화국: { tz: "Africa/Johannesburg", plugs: "C·M·N", volt: "230V", sos: "경찰 10111 · 구급 10177", tip: "10~15%" },
  케냐: { tz: "Africa/Nairobi", plugs: "G", volt: "240V", sos: "999 · 112", tip: "10%" },
  탄자니아: { tz: "Africa/Dar_es_Salaam", plugs: "D·G", volt: "230V", sos: "112", tip: "10%, 사파리 가이드는 따로" },
  튀니지: { tz: "Africa/Tunis", plugs: "C·E", volt: "230V", sos: "경찰 197 · 구급 190", tip: "10%" },
  나미비아: { tz: "Africa/Windhoek", plugs: "D·M", volt: "220V", sos: "경찰 10111 · 휴대폰 112", tip: "10%" },
  세이셸: { tz: "Indian/Mahe", plugs: "G", volt: "240V", sos: "999", tip: "봉사료 포함" },

  호주: { tz: "Australia/Sydney", plugs: "I", volt: "230V", sos: "000", tip: "필요 없음" },
  뉴질랜드: { tz: "Pacific/Auckland", plugs: "I", volt: "230V", sos: "111", tip: "필요 없음" },
  피지: { tz: "Pacific/Fiji", plugs: "I", volt: "240V", sos: "911", tip: "필요 없음" },
  괌: { tz: "Pacific/Guam", plugs: "A·B", volt: "110V", sos: "911", tip: "10~15%" },
  사이판: { tz: "Pacific/Saipan", plugs: "A·B", volt: "120V", sos: "911", tip: "10~15%" },
  팔라우: { tz: "Pacific/Palau", plugs: "A·B", volt: "120V", sos: "911", tip: "10%" },
  "프랑스령 폴리네시아": { tz: "Pacific/Tahiti", plugs: "C·E", volt: "220V", sos: "경찰 17 · 구급 15", tip: "필요 없음" },
  파푸아뉴기니: { tz: "Pacific/Port_Moresby", plugs: "I", volt: "240V", sos: "경찰 112 · 구급 111", tip: "필요 없음" },

  아랍에미리트: { tz: "Asia/Dubai", plugs: "G", volt: "230V", sos: "경찰 999 · 구급 998", tip: "10%" },
  터키: { tz: "Europe/Istanbul", plugs: "C·F", volt: "230V", sos: "112", tip: "5~10%" },
  사우디아라비아: { tz: "Asia/Riyadh", plugs: "G", volt: "230V", sos: "911", tip: "선택" },
  카타르: { tz: "Asia/Qatar", plugs: "D·G", volt: "240V", sos: "999", tip: "10%" },
  이스라엘: { tz: "Asia/Jerusalem", plugs: "C·H", volt: "230V", sos: "경찰 100 · 구급 101", tip: "10~15%" },
  요르단: { tz: "Asia/Amman", plugs: "C·D·F·G·J", volt: "230V", sos: "911", tip: "10%" },
  오만: { tz: "Asia/Muscat", plugs: "G", volt: "240V", sos: "9999", tip: "선택" },
  바레인: { tz: "Asia/Bahrain", plugs: "G", volt: "230V", sos: "999", tip: "10%" },
};

/** 시간대가 여럿인 나라는 도시마다 덮어쓴다 */
const CITY_OVERRIDE: Record<string, Partial<CountryInfo>> = {
  로스앤젤레스: { tz: "America/Los_Angeles" },
  샌프란시스코: { tz: "America/Los_Angeles" },
  라스베이거스: { tz: "America/Los_Angeles" },
  시애틀: { tz: "America/Los_Angeles" },
  시카고: { tz: "America/Chicago" },
  호놀룰루: { tz: "Pacific/Honolulu" },
  밴쿠버: { tz: "America/Vancouver" },
  캘거리: { tz: "America/Edmonton" },
  핼리팩스: { tz: "America/Halifax" },
  칸쿤: { tz: "America/Cancun" },
  툴룸: { tz: "America/Cancun" },
  로스카보스: { tz: "America/Mazatlan" },
  메리다: { tz: "America/Merida" },
  마나우스: { tz: "America/Manaus" },
  이스터섬: { tz: "Pacific/Easter" },
  "푸에르토 나탈레스": { tz: "America/Punta_Arenas" },
  갈라파고스: { tz: "Pacific/Galapagos" },
  "발리 우부드": { tz: "Asia/Makassar" },
  "발리 쿠타": { tz: "Asia/Makassar" },
  코모도: { tz: "Asia/Makassar" },
  롬복: { tz: "Asia/Makassar" },
  케언즈: { tz: "Australia/Brisbane" },
  골드코스트: { tz: "Australia/Brisbane" },
  브리즈번: { tz: "Australia/Brisbane" },
  퍼스: { tz: "Australia/Perth" },
  울루루: { tz: "Australia/Darwin" },
  애들레이드: { tz: "Australia/Adelaide" },
  홍콩: { tz: "Asia/Hong_Kong", plugs: "G", sos: "999", tip: "봉사료 10% 포함" },
};

export function countryInfo(country?: string | null, region?: string | null): CountryInfo | null {
  const base = country ? COUNTRY_INFO[country] : undefined;
  if (!base) return null;
  return { ...base, ...(region ? CITY_OVERRIDE[region] : undefined) };
}

/** 한국 플러그(C·F)를 그대로 꽂을 수 있는지: C·E·F 콘센트면 대부분 들어간다 */
export function koreanPlugFits(plugs: string) {
  return /[CEF]/.test(plugs);
}

/** 그 시간대가 UTC 보다 몇 분 앞서는지 */
export function utcOffsetMin(tz: string, at = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name ?? "");
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}
