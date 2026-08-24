import { NextRequest } from "next/server";
import { searchFlightOffers } from "@/lib/amadeus";
import type { FlightsApiResponse, SearchLink } from "@/features/search/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/search/flights?origin=ICN&destination=NRT&date=2026-09-01&adults=1&currency=KRW
 * - Amadeus 키가 있고 성공 → { mode: "offers", offers: [...] }
 * - 키 없음 / 호출 실패 / 결과 0건 → { mode: "links", links: [딥링크...] }
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const origin = (sp.get("origin") ?? "").trim().toUpperCase();
  const destination = (sp.get("destination") ?? "").trim().toUpperCase();
  const date = sp.get("date") ?? "";
  const adults = Math.min(Math.max(Number(sp.get("adults")) || 1, 1), 9);
  const currency = (sp.get("currency") ?? "KRW").toUpperCase();

  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
    return Response.json(
      { error: "origin/destination must be 3-letter IATA codes" },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (origin === destination) {
    return Response.json({ error: "origin equals destination" }, { status: 400 });
  }

  try {
    const offers = await searchFlightOffers({ origin, destination, date, adults, currency });
    if (offers !== null) {
      const body: FlightsApiResponse = { mode: "offers", currency, offers };
      return Response.json(body);
    }
  } catch {
    // 폴백으로 진행
  }

  const links: SearchLink[] = [
    {
      provider: "Google Flights",
      label: `${origin} → ${destination} 항공권 검색`,
      url: `https://www.google.com/travel/flights?q=${encodeURIComponent(
        `Flights from ${origin} to ${destination} on ${date} one way`,
      )}`,
      description: `${date} · 성인 ${adults}명`,
    },
    {
      provider: "Skyscanner",
      label: "스카이스캐너에서 비교하기",
      url: `https://www.skyscanner.net/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${date.replaceAll("-", "").slice(2)}/?adultsv2=${adults}&currencycode=${currency}`,
      description: "최저가 항공사 한눈에 비교",
    },
    {
      provider: "네이버항공권",
      label: "네이버항공권에서 예매하기",
      url: `https://flight.naver.com/flights/results?tripway=oneway&departDt=${date}&departCty=${origin}&arrvCty=${destination}&people=${adults}`,
      description: "국내 이용자에게 익숙한 예매 플로우",
    },
  ];

  const body: FlightsApiResponse = { mode: "links", links };
  return Response.json(body);
}
