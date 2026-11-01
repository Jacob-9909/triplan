import { apiGet } from "@/lib/api";

/** 여행 나라 → 현지 장소 이름의 언어 (번역 원문 언어 힌트) */
const COUNTRY_LANG: Record<string, string> = {
  일본: "ja", // i18n-ignore
  중국: "zh-CN", // i18n-ignore
  대만: "zh-TW", // i18n-ignore
  홍콩: "zh-TW", // i18n-ignore
  마카오: "zh-TW", // i18n-ignore
  태국: "th", // i18n-ignore
  베트남: "vi", // i18n-ignore
  인도네시아: "id", // i18n-ignore
  말레이시아: "ms", // i18n-ignore
  프랑스: "fr", // i18n-ignore
  이탈리아: "it", // i18n-ignore
  스페인: "es", // i18n-ignore
  독일: "de", // i18n-ignore
  오스트리아: "de", // i18n-ignore
  스위스: "de", // i18n-ignore
  네덜란드: "nl", // i18n-ignore
  포르투갈: "pt", // i18n-ignore
  브라질: "pt", // i18n-ignore
  체코: "cs", // i18n-ignore
  그리스: "el", // i18n-ignore
  헝가리: "hu", // i18n-ignore
  튀르키예: "tr", // i18n-ignore
  터키: "tr", // i18n-ignore
  러시아: "ru", // i18n-ignore
  멕시코: "es", // i18n-ignore
  아르헨티나: "es", // i18n-ignore
  칠레: "es", // i18n-ignore
  페루: "es", // i18n-ignore
  쿠바: "es", // i18n-ignore
  미국: "en", // i18n-ignore
  영국: "en", // i18n-ignore
  캐나다: "en", // i18n-ignore
  호주: "en", // i18n-ignore
  뉴질랜드: "en", // i18n-ignore
  싱가포르: "en", // i18n-ignore
};

export const hasHangul = (s: string) => /[가-힣]/.test(s); // i18n-ignore

/** 원문 언어 추정: 가나가 있으면 일본어, 아니면 여행 나라 기준 */
export function sourceLang(name: string, country?: string | null) {
  if (/[぀-ヿ]/.test(name)) return "ja";
  return (country && COUNTRY_LANG[country]) || "autodetect";
}

/** 한글이 없는 장소 이름을 한국어로 번역. 실패하면 null */
export async function translateName(name: string, country?: string | null): Promise<string | null> {
  if (!name.trim() || hasHangul(name)) return null;
  const params = new URLSearchParams({ q: name.trim(), from: sourceLang(name, country) });
  try {
    const { text } = await apiGet<{ text: string | null }>(`/api/translate?${params}`);
    return text;
  } catch {
    return null;
  }
}

/** 원문 오른쪽에 한국어를 붙인 표시 이름: "東京タワー (도쿄 타워)" */
export const withKorean = (name: string, ko: string) => `${name} (${ko})`;
