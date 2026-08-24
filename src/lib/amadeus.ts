import type { FlightOffer, HotelOffer } from "@/features/search/types";

/**
 * Amadeus Self-Service API 클라이언트 (의존성 없이 fetch 기반)
 * - 키가 없거나 호출 실패 시 null 반환 → 라우트 핸들러가 딥링크 폴백 처리
 */

const HOST =
  process.env.AMADEUS_HOSTNAME === "production"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";

let tokenCache: { token: string; expiresAt: number } | null = null;

function hasCredentials(): boolean {
  return Boolean(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
}

/** OAuth2 토큰 발급 + 메모리 캐싱. 실패 시 null */
async function getAccessToken(): Promise<string | null> {
  if (!hasCredentials()) return null;

  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  try {
    const res = await fetch(`${HOST}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.AMADEUS_CLIENT_ID as string,
        client_secret: process.env.AMADEUS_CLIENT_SECRET as string,
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    // 만료 60초 전까지 재사용
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + ((data.expires_in ?? 1799) - 60) * 1000,
    };
    return tokenCache.token;
  } catch {
    return null;
  }
}

async function amadeusGet<T>(token: string, path: string): Promise<T | null> {
  try {
    const res = await fetch(`${HOST}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ---------- 항공권: Flight Offers Search v2 ---------- */

interface AmadeusFlightOffer {
  id: string;
  price?: { grandTotal?: string; total?: string; currency?: string };
  itineraries?: Array<{
    duration?: string;
    segments?: Array<{
      carrierCode?: string;
      departure?: { iataCode?: string; at?: string };
      arrival?: { iataCode?: string; at?: string };
    }>;
  }>;
}

function parseIsoDurationToMinutes(d: string | undefined): number {
  if (!d) return 0;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?$/.exec(d);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  date: string; // YYYY-MM-DD
  adults: number;
  currency: string;
}

export async function searchFlightOffers(
  params: FlightSearchParams,
): Promise<FlightOffer[] | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const qs = new URLSearchParams({
    originLocationCode: params.origin,
    destinationLocationCode: params.destination,
    departureDate: params.date,
    adults: String(params.adults),
    currencyCode: params.currency,
    max: "12",
  });

  const data = await amadeusGet<{
    data?: AmadeusFlightOffer[];
    dictionaries?: { carriers?: Record<string, string> };
  }>(token, `/v2/shopping/flight-offers?${qs}`);
  if (!data?.data) return null;

  const carriers = data.dictionaries?.carriers ?? {};
  const offers: FlightOffer[] = [];
  for (const raw of data.data) {
    const itinerary = raw.itineraries?.[0];
    const segments = itinerary?.segments ?? [];
    if (!segments.length || !raw.price) continue;
    const first = segments[0];
    const last = segments[segments.length - 1];
    const departAt = first.departure?.at;
    const arriveAt = last.arrival?.at;
    if (!departAt || !arriveAt) continue;
    offers.push({
      id: raw.id,
      airline: first.carrierCode ?? "",
      airlineName: (first.carrierCode && carriers[first.carrierCode]) || null,
      origin: first.departure?.iataCode ?? params.origin,
      destination: last.arrival?.iataCode ?? params.destination,
      departAt,
      arriveAt,
      durationMinutes:
        parseIsoDurationToMinutes(itinerary?.duration) ||
        Math.round((Date.parse(arriveAt) - Date.parse(departAt)) / 60000),
      stops: segments.length - 1,
      price: Number(raw.price.grandTotal ?? raw.price.total ?? 0),
      currency: raw.price.currency ?? params.currency,
      deepLink: `https://www.google.com/travel/flights?q=${encodeURIComponent(
        `Flights from ${params.origin} to ${params.destination} on ${params.date} one way`,
      )}`,
    });
  }
  return offers.length ? offers : [];
}

/* ---------- 숙소: Hotel List + Hotel Offers ---------- */

interface AmadeusHotel {
  hotelId?: string;
  name?: string;
  rating?: number;
}

interface AmadeusHotelOfferRaw {
  hotel?: AmadeusHotel;
  offers?: Array<{
    room?: { description?: { text?: string } };
    price?: { total?: string; currency?: string };
  }>;
}

export interface HotelSearchParams {
  cityCode?: string; // IATA 도시 코드 (예: NRT)
  lat?: number;
  lng?: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  guests: number;
  currency: string;
}

export async function searchHotelOffers(
  params: HotelSearchParams,
): Promise<HotelOffer[] | null> {
  const token = await getAccessToken();
  if (!token) return null;

  // 1단계: 도시/좌표로 호텔 ID 목록 조회
  let hotelIds: string[];
  if (params.cityCode) {
    const list = await amadeusGet<{ data?: Array<{ hotelId?: string }> }>(
      token,
      `/v1/reference-data/locations/hotels/by-city?cityCode=${encodeURIComponent(params.cityCode)}&max=40`,
    );
    hotelIds = (list?.data ?? []).map((h) => h.hotelId ?? "").filter(Boolean);
  } else if (params.lat != null && params.lng != null) {
    const list = await amadeusGet<{ data?: Array<{ hotelId?: string }> }>(
      token,
      `/v1/reference-data/locations/hotels/by-geocode?latitude=${params.lat}&longitude=${params.lng}&radius=5&radiusUnit=KM&max=40`,
    );
    hotelIds = (list?.data ?? []).map((h) => h.hotelId ?? "").filter(Boolean);
  } else {
    return null;
  }
  if (!hotelIds.length) return [];

  // 2단계: 호텔 오퍼(요금) 조회
  const qs = new URLSearchParams({
    hotelIds: hotelIds.slice(0, 40).join(","),
    checkInDate: params.checkIn,
    checkOutDate: params.checkOut,
    adults: String(params.guests),
    roomQuantity: "1",
    currency: params.currency,
  });
  const data = await amadeusGet<{ data?: AmadeusHotelOfferRaw[] }>(
    token,
    `/v3/shopping/hotel-offers?${qs}`,
  );
  if (!data?.data) return null;

  const offers: HotelOffer[] = [];
  for (const raw of data.data) {
    if (!raw.hotel?.hotelId || !raw.offers?.length) continue;
    const price = raw.offers[0].price;
    if (!price?.total) continue;
    offers.push({
      id: raw.hotel.hotelId,
      name: raw.hotel.name ?? "Unknown Hotel",
      rating:
        typeof raw.hotel.rating === "number" && raw.hotel.rating > 0
          ? Math.min(raw.hotel.rating, 5)
          : null,
      score: null,
      totalPrice: Number(price.total),
      currency: price.currency ?? params.currency,
      roomDesc: raw.offers[0].room?.description?.text ?? null,
      deepLink: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
        raw.hotel.name ?? "",
      )}&checkin=${params.checkIn}&checkout=${params.checkOut}&group_adults=${params.guests}`,
    });
  }
  return offers;
}

