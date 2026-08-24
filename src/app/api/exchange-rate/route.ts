import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** 1 단위당 대략적인 원화 가치 (fallback 용 대략치) */
const APPROX_KRW: Record<string, number> = {
  KRW: 1,
  USD: 1380,
  EUR: 1500,
  JPY: 920,
  CNY: 190,
  TWD: 43,
  HKD: 177,
  SGD: 1030,
  THB: 38,
  VND: 0.053,
  PHP: 24,
  MYR: 295,
  GBP: 1760,
  CHF: 1560,
  AUD: 900,
  CAD: 1010,
  NZD: 830,
  MXN: 76,
};

function fallbackRate(from: string, to: string): number | null {
  const f = APPROX_KRW[from];
  const t = APPROX_KRW[to];
  if (!f || !t) return null;
  return t / f;
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

async function fetchFrankfurter(from: string, to: string, date: string) {
  const res = await fetch(
    `https://api.frankfurter.app/${date}?from=${from}&to=${to}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`frankfurter ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  const rate = data.rates?.[to];
  if (!rate || typeof rate !== "number") throw new Error("frankfurter no rate");
  return rate;
}

async function fetchErApiLatest(from: string, to: string) {
  const key = process.env.EXCHANGE_RATE_API_KEY;
  const url = `https://open.er-api.com/v6/latest/${from}${key ? `?apikey=${key}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`er-api ${res.status}`);
  const data = (await res.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };
  const rate = data.rates?.[to];
  if (data.result !== "success" || !rate || typeof rate !== "number") {
    throw new Error("er-api no rate");
  }
  return rate;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const from = (sp.get("from") ?? "USD").toUpperCase();
  const to = (sp.get("to") ?? "KRW").toUpperCase();
  const date = sp.get("date");

  try {
    // 과거 날짜(오늘 이전)는 frankfurter 우선
    if (date && isValidDate(date)) {
      const today = new Date().toISOString().slice(0, 10);
      if (date < today && from !== to) {
        try {
          const rate = await fetchFrankfurter(from, to, date);
          return Response.json({
            from,
            to,
            date,
            rate,
            source: "frankfurter",
            stale: false,
          });
        } catch {
          // frankfurter 미지원 통화 → 아래 최신 환율로 폴백
        }
      }
      if (from === to) {
        return Response.json({ from, to, date, rate: 1, source: "identity", stale: false });
      }
    }

    const rate = await fetchErApiLatest(from, to);
    return Response.json({ from, to, rate, source: "er-api", stale: false });
  } catch {
    const approx = fallbackRate(from, to);
    if (approx === null) {
      return Response.json(
        { error: `unsupported currency pair: ${from}->${to}` },
        { status: 400 },
      );
    }
    return Response.json({
      from,
      to,
      date,
      rate: approx,
      source: "fallback",
      stale: true,
    });
  }
}
