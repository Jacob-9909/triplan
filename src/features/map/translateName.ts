import { apiGet } from "@/lib/api";

/** 여행 나라 → 현지 장소 이름의 언어 (번역 원문 언어 힌트) */
const COUNTRY_LANG: Record<string, string> = {
  일본: "ja",
  중국: "zh-CN",
  대만: "zh-TW",
  홍콩: "zh-TW",
  마카오: "zh-TW",
  태국: "th",
  베트남: "vi",
  인도네시아: "id",
  말레이시아: "ms",
  프랑스: "fr",
  이탈리아: "it",
  스페인: "es",
  독일: "de",
  오스트리아: "de",
  스위스: "de",
  네덜란드: "nl",
  포르투갈: "pt",
  브라질: "pt",
  체코: "cs",
  그리스: "el",
  헝가리: "hu",
  튀르키예: "tr",
  터키: "tr",
  러시아: "ru",
  멕시코: "es",
  아르헨티나: "es",
  칠레: "es",
  페루: "es",
  쿠바: "es",
  미국: "en",
  영국: "en",
  캐나다: "en",
  호주: "en",
  뉴질랜드: "en",
  싱가포르: "en",
};

export const hasHangul = (s: string) => /[가-힣]/.test(s);

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
