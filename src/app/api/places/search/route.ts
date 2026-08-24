import { NextResponse } from "next/server";

/** 프론트가 기대하는 카카오 로컬 API 호환 문서 형태 */
interface PlaceDoc {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string | null;
  x: string;
  y: string;
  category_group_code?: string;
}

/**
 * 카카오 로컬 API 키워드 장소 검색 프록시.
 * - KAKAO_REST_KEY가 있으면 국내 검색에 카카오를 우선 사용
 * - 결과가 비면(=해외 장소) OSM 기반 Photon으로 재검색 (키 불필요, 글로벌 커버)
 * REST 키(KAKAO_REST_KEY)는 서버에서만 사용되며 클라이언트로 노출되지 않는다.
 */

async function searchKakao(q: string, x?: string | null, y?: string | null): Promise<PlaceDoc[]> {
  const key = process.env.KAKAO_REST_KEY;
  if (!key) return [];
  const kakaoUrl = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  kakaoUrl.searchParams.set("query", q);
  // x/y는 결과를 줄이는 필터가 아니라 거리 정렬 기준으로만 사용 (반경 제한 없음)
  if (x && y) {
    kakaoUrl.searchParams.set("x", x);
    kakaoUrl.searchParams.set("y", y);
  }
  const res = await fetch(kakaoUrl, {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.documents ?? []).map((d: Record<string, string>) => ({
    id: d.id,
    place_name: d.place_name,
    address_name: d.address_name,
    road_address_name: d.road_address_name || null,
    x: d.x,
    y: d.y,
    category_group_code: d.category_group_code,
  }));
}

/** OSM key/value → 카카오 category_group_code 규격 */
function groupFromOsm(osmKey?: string, osmValue?: string): string | undefined {
  const k = osmKey ?? "";
  const v = osmValue ?? "";
  if ((k === "amenity" && ["restaurant", "cafe", "fast_food", "bar", "pub", "ice_cream", "bakery", "food_court"].includes(v)) || k === "cuisine")
    return "FD6"; // 음식점
  if (k === "amenity" && v === "cafe") return "CE7"; // 카페
  if (k === "tourism" && ["hotel", "guest_house", "hostel", "motel", "apartment"].includes(v)) return "AD5"; // 숙박
  if (k === "shop") return "SH11"; // 쇼핑
  if (k === "tourism" && ["attraction", "viewpoint", "zoo", "theme_park", "aquarium", "gallery", "artwork", "museum"].includes(v)) return "AT4"; // 관광명소
  if (k === "historic" || k === "heritage" || (k === "tourism" && v === "museum")) return "CT1"; // 문화시설
  if (k === "leisure" && ["park", "garden", "beach_resort", "water_park"].includes(v)) return "AT4";
  return undefined;
}

async function searchPhoton(q: string, x?: string | null, y?: string | null): Promise<PlaceDoc[]> {
  const u = new URL("https://photon.komoot.io/api/");
  u.searchParams.set("q", q);
  u.searchParams.set("limit", "10");
  if (x && y) {
    u.searchParams.set("lon", x);
    u.searchParams.set("lat", y);
    // zoom이 클수록 좌표 근처 결과를 강하게 우선함
    u.searchParams.set("zoom", "16");
  }
  try {
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features ?? [])
      .filter((f: { properties?: { name?: string } }) => f.properties?.name)
      .map((f: {
        geometry?: { coordinates?: [number, number] };
        properties?: Record<string, unknown>;
      }) => {
        const p = f.properties as Record<string, string>;
        const [lng, lat] = f.geometry?.coordinates ?? [0, 0];
        const address = [p.street, p.district, p.city, p.state].filter(Boolean).join(", ") || p.country || "";
        return {
          id: String(p.osm_id ?? `${lng},${lat}`),
          place_name: String(p.name),
          address_name: address,
          road_address_name: null,
          x: String(lng),
          y: String(lat),
          category_group_code: groupFromOsm(p.osm_key, p.osm_value),
        } satisfies PlaceDoc;
      });
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ documents: [] });

  const x = url.searchParams.get("x");
  const y = url.searchParams.get("y");

  let docs = await searchKakao(q, x, y);
  let source: "kakao" | "photon" = "kakao";
  if (docs.length === 0) {
    docs = await searchPhoton(q, x, y);
    source = "photon";
  }

  return NextResponse.json({ documents: docs, source });
}
