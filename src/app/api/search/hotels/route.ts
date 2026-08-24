import { NextRequest } from "next/server";
import { searchHotelOffers } from "@/lib/amadeus";
import type { HotelsApiResponse, SearchLink } from "@/features/search/types";

export const dynamic = "force-dynamic";

/** 국내(한국) 지역 판단용 IATA 도시/공항 코드 */
const DOMESTIC_CODES = new Set([
  "SEL", "GMP", "ICN", "PUS", "CJU", "TAE", "KWX", "MWX", "RSN", "USN",
]);

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

/**
 * GET /api/search/hotels?cityCode=NRT | lat,lng&checkIn=2026-09-01&checkOut=2026-09-04&guests=2&currency=KRW
 * - Amadeus 키가 있고 성공 → { mode: "offers", offers: [...] }
 * - 키 없음 / 실패 → { mode: "links", links: [아고다·부킹닷컴 or 야놀자·여기어디] }
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const cityCode = (sp.get("cityCode") ?? "").trim().toUpperCase() || null;
  const latRaw = sp.get("lat");
  const lngRaw = sp.get("lng");
  const lat = latRaw !== null ? Number(latRaw) : null;
  const lng = lngRaw !== null ? Number(lngRaw) : null;
  const checkIn = sp.get("checkIn") ?? "";
  const checkOut = sp.get("checkOut") ?? "";
  const guests = Math.min(Math.max(Number(sp.get("guests")) || 2, 1), 9);
  const currency = (sp.get("currency") ?? "KRW").toUpperCase();

  if (!cityCode && (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng))) {
    return Response.json(
      { error: "cityCode 또는 lat,lng 중 하나는 필수입니다" },
      { status: 400 },
    );
  }
  if (!isValidDate(checkIn) || !isValidDate(checkOut) || checkOut <= checkIn) {
    return Response.json({ error: "checkIn/checkOut must be YYYY-MM-DD and checkOut > checkIn" }, { status: 400 });
  }

  try {
    const offers = await searchHotelOffers({
      cityCode: cityCode ?? undefined,
      lat: Number.isNaN(lat as number) ? undefined : (lat as number),
      lng: Number.isNaN(lng as number) ? undefined : (lng as number),
      checkIn,
      checkOut,
      guests,
      currency,
    });
    if (offers !== null) {
      const body: HotelsApiResponse = { mode: "offers", currency, offers };
      return Response.json(body);
    }
  } catch {
    // 폴백으로 진행
  }

  const isDomestic = cityCode !== null && DOMESTIC_CODES.has(cityCode);
  const nights = Math.max(
    1,
    Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000),
  );

  let links: SearchLink[];
  if (isDomestic) {
    links = [
      {
        provider: "야놀자",
        label: "야놀자에서 숙소 찾기",
        url: `https://www.yanolja.com/search?searchType=all&q=${encodeURIComponent(cityCode ?? "")}&checkin=${checkIn}&checkout=${checkOut}&adult=${guests}`,
        description: `국내 숙소 · ${nights}박`,
      },
      {
        provider: "여기어때",
        label: "여기어때에서 비교하기",
        url: `https://www.yeogieottae.com/search?keyword=${encodeURIComponent(cityCode ?? "")}&checkIn=${checkIn}&checkOut=${checkOut}`,
        description: "모텔·펜션·호텔 국내 최다 보유",
      },
    ];
  } else {
    links = [
      {
        provider: "Agoda",
        label: "아고다에서 숙소 찾기",
        url: `https://www.agoda.com/Search?textToSearch=${encodeURIComponent(cityCode ?? "")}&checkIn=${checkIn.replaceAll("-", "")}&los=${nights}&adults=${guests}&currencyCode=${currency}`,
        description: `${cityCode ?? ""} · ${nights}박 · 아시아 강점`,
      },
      {
        provider: "Booking.com",
        label: "부킹닷컴에서 예매하기",
        url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(cityCode ?? "")}&checkin=${checkIn}&checkout=${checkOut}&group_adults=${guests}`,
        description: "무료 취소 옵션이 많은 글로벌 숙소",
      },
    ];
  }

  const body: HotelsApiResponse = { mode: "links", links };
  return Response.json(body);
}
