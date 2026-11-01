import { cookies, headers } from "next/headers";
import { CURRENCY_COOKIE, isHomeCurrency, LOCALE_COOKIE, makeT, pickLocale, THEME_COOKIE, type HomeCurrency, type Locale, type Theme } from "./translate";

/** 서버 컴포넌트·generateMetadata 용 */
export async function getLocale(): Promise<Locale> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return pickLocale(c.get(LOCALE_COOKIE)?.value, h.get("accept-language"));
}

export async function getT() {
  return makeT(await getLocale());
}

export async function getTheme(): Promise<Theme> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return v === "light" || v === "dark" ? v : "system";
}

/** 직접 고른 기본 통화. 없으면 null (언어를 따른다) */
export async function getCurrency(): Promise<HomeCurrency | null> {
  const v = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return isHomeCurrency(v) ? v : null;
}
