/**
 * 장소 정보 찾기: Nominatim(OpenStreetMap 검색)으로 장소 근처(약 600m 상자)에서 같은 이름을 찾아
 * 영업시간·전화·웹사이트·주소를, 위키데이터·위키백과에서 사진과 짧은 설명을 가져온다.
 * Nominatim 은 여러 언어 이름(name:ko 등)으로 찾고 초당 1건 정책이라 결과는 DB 에 캐시한다.
 * 실패하면 null (다음에 다시 찾는다), 못 찾으면 빈 객체.
 * ponytail: Overpass 는 반경 질의가 붐비면 수십 초씩 걸려 쓰지 않는다
 */
import { ROUTING_USER_AGENT } from "./routing/valhalla.ts";

export interface PlaceInfo {
  /** 찾은 OSM 요소 (osm.org 링크용) */
  osm?: { type: string; id: number } | null;
  hours?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  /** 위키백과 요약 첫 부분 */
  summary?: string | null;
  image?: string | null;
  wikipedia?: string | null;
}

export interface NominatimHit {
  osm_type: string;
  osm_id: number | string;
  display_name?: string;
  extratags?: Record<string, string> | null;
}

/** 장소 둘레 ±0.006°(약 600m) 상자 안에서만 이름으로 찾는다 */
export function nominatimUrl(name: string, lat: number, lng: number, locale: "ko" | "en"): string {
  const d = 0.006;
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("q", name.trim());
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("extratags", "1");
  u.searchParams.set("limit", "1");
  u.searchParams.set("bounded", "1");
  u.searchParams.set("viewbox", `${lng - d},${lat + d},${lng + d},${lat - d}`);
  u.searchParams.set("accept-language", locale);
  return u.toString();
}

/**
 * Nominatim display_name("이름, 번지, 동네, 구, 시, 우편번호, 나라") → 주소.
 * 이름·나라·우편번호를 빼고, 한국어는 큰 단위부터(도쿄도 다이토구 아사쿠사 2-3-1), 영어는 그대로 쉼표로
 */
export function addressFrom(display: string | undefined, locale: "ko" | "en"): string | null {
  // 우편번호: 일본 111-0032, 한국·미국 5자리(미국은 -4자리 붙기도). 번지 2-3-1 은 남긴다
  const parts = (display ?? "")
    .split(", ")
    .slice(1, -1)
    .filter((p) => !/^\d{3}-\d{4}$/.test(p) && !/^\d{5}(-\d{4})?$/.test(p));
  if (!parts.length) return null;
  return locale === "ko" ? [...parts].reverse().join(" ") : parts.join(", ");
}

/** OSM 태그에서 화면에 쓸 값 (주소는 addr:full 이 있을 때만, 없으면 display_name 으로) */
export function infoFromTags(tags: Record<string, string>): PlaceInfo {
  const website = tags.website ?? tags["contact:website"] ?? tags.url ?? null;
  return {
    hours: tags.opening_hours ?? null,
    phone: tags.phone ?? tags["contact:phone"] ?? null,
    website: website && /^https?:\/\//i.test(website) ? website : null,
    address: tags["addr:full"] ?? null,
  };
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": ROUTING_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/** 위키백과 문서 제목: 위키데이터 sitelink(화면 언어 → 영어) 또는 OSM wikipedia 태그("ko:제목"), 그리고 위키미디어 대표 사진 */
async function wikiTitle(tags: Record<string, string>, locale: "ko" | "en"): Promise<{ lang: string; title: string; commons: string | null } | null> {
  let commons: string | null = null;
  if (/^Q\d+$/.test(tags.wikidata ?? "")) {
    try {
      const data = (await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${tags.wikidata}.json`)) as {
        entities?: Record<string, { sitelinks?: Record<string, { title: string }>; claims?: { P18?: { mainsnak?: { datavalue?: { value?: string } } }[] } }>;
      };
      const entity = data.entities?.[tags.wikidata];
      commons = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value ?? null;
      for (const lang of [locale, "en"]) {
        const title = entity?.sitelinks?.[`${lang}wiki`]?.title;
        if (title) return { lang, title, commons };
      }
    } catch {}
  }
  const m = /^([a-z-]+):(.+)$/.exec(tags.wikipedia ?? "");
  return m ? { lang: m[1], title: m[2], commons } : commons ? { lang: "", title: "", commons } : null;
}

export async function fetchPlaceInfo(name: string, lat: number, lng: number, locale: "ko" | "en"): Promise<PlaceInfo | null> {
  let hit: NominatimHit | undefined;
  try {
    hit = ((await getJson(nominatimUrl(name, lat, lng, locale))) as NominatimHit[])[0];
  } catch {
    return null;
  }
  if (!hit) return {};
  const tags = hit.extratags ?? {};
  const info: PlaceInfo = { osm: { type: hit.osm_type, id: Number(hit.osm_id) }, ...infoFromTags(tags) };
  info.address ??= addressFrom(hit.display_name, locale);
  const wiki = await wikiTitle(tags, locale);
  if (wiki?.title) {
    try {
      const s = (await getJson(`https://${wiki.lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wiki.title)}`)) as {
        extract?: string;
        thumbnail?: { source?: string };
        content_urls?: { desktop?: { page?: string } };
      };
      info.summary = s.extract ? s.extract.slice(0, 400) : null;
      // 문서 썸네일은 도표·지도일 때가 있어 위키데이터 대표 사진(P18)이 없을 때만 쓴다
      info.image = wiki.commons ? null : (s.thumbnail?.source ?? null);
      info.wikipedia = s.content_urls?.desktop?.page ?? null;
    } catch {}
  }
  if (!info.image && wiki?.commons) {
    info.image = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(wiki.commons)}?width=640`;
  }
  return info;
}
