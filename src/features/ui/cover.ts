import { getCountryBackground } from "@/data/countryBackgrounds";
import { findCityBackground, getCityBackground } from "@/data/cityBackgrounds";

// 화면(CoverPhoto)과 서버 이미지(링크 미리보기·회고 카드)가 같은 사진을 고르도록 여기 둔다

/** 사진이 없는 나라용 대륙별 그라디언트 */
const CONTINENT_GRADIENTS: Record<string, string> = {
  아시아: "linear-gradient(160deg, #e8553d 0%, #8c2f1f 100%)", // i18n-ignore
  유럽: "linear-gradient(160deg, #2f5d8a 0%, #14233b 100%)", // i18n-ignore
  북미: "linear-gradient(160deg, #0d6b63 0%, #14233b 100%)", // i18n-ignore
  남미: "linear-gradient(160deg, #e9a23b 0%, #a8331c 100%)", // i18n-ignore
  아프리카: "linear-gradient(160deg, #c26a2c 0%, #5a2a14 100%)", // i18n-ignore
  오세아니아: "linear-gradient(160deg, #1f8a85 0%, #0e3b54 100%)", // i18n-ignore
  중동: "linear-gradient(160deg, #b7791f 0%, #5c3b14 100%)", // i18n-ignore
};
/** trips.continent 는 영어 id 로 저장된다 */
const CONTINENT_IDS: Record<string, string> = {
  asia: "아시아", // i18n-ignore
  europe: "유럽", // i18n-ignore
  "north-america": "북미", // i18n-ignore
  "south-america": "남미", // i18n-ignore
  africa: "아프리카", // i18n-ignore
  oceania: "오세아니아", // i18n-ignore
  "middle-east": "중동", // i18n-ignore
};
export const DEFAULT_GRADIENT = "linear-gradient(160deg, #24365a 0%, #14233b 100%)";

export interface CoverKey {
  country?: string | null;
  /** 도시·지역 이름. 도시 사진이 있으면 나라 사진보다 먼저 쓴다 */
  city?: string | null;
  /** 제목(예: "교토 단풍"). 도시 이름이 들어 있으면 그 도시 사진을 쓴다 */
  title?: string | null;
}

/** public/ 아래 사진 경로 ("/backgrounds/…jpg"). 없으면 null */
export function coverImage({ country, city, title }: CoverKey): string | null {
  return getCityBackground(city) ?? findCityBackground(title) ?? getCountryBackground(country)?.image ?? null;
}

/** 사진이 없을 때 깔 대륙 그라디언트 */
export function coverGradient(continent?: string | null): string {
  return CONTINENT_GRADIENTS[CONTINENT_IDS[continent ?? ""] ?? continent ?? ""] ?? DEFAULT_GRADIENT;
}
