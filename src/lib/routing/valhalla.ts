import type { RouteStep } from "@/lib/types";
import type { LatLng } from "../../features/route/directions.ts";
import { decodePolyline } from "../../features/route/geometry.ts";

/** 경로 서비스 하나가 돌려주는 결과 (저장·화면 공통 형태) */
export interface RouteResult {
  duration_min: number;
  distance_km: number;
  fare_krw: number | null;
  /** [lng, lat] */
  shape: [number, number][];
  steps: RouteStep[] | null;
}

export type ValhallaCosting = "pedestrian" | "auto" | "bicycle";

const URL_ROUTE = "https://valhalla1.openstreetmap.de/route";
/** FOSSGIS 이용 조건: 앱을 밝히는 User-Agent, 초당 1건 이하 */
export const ROUTING_USER_AGENT = "Triplan/1.0 (+https://triplan.161-33-134-252.sslip.io)";

export function parseValhalla(json: unknown): RouteResult | null {
  const trip = (json as { trip?: { summary?: { time?: number; length?: number }; legs?: { shape?: string }[] } })?.trip;
  const shape = trip?.legs?.[0]?.shape;
  if (!trip?.summary || typeof trip.summary.time !== "number" || typeof shape !== "string") return null;
  return {
    duration_min: Math.max(1, Math.round(trip.summary.time / 60)),
    distance_km: trip.summary.length ?? 0,
    fare_krw: null,
    shape: decodePolyline(shape, 6),
    steps: null,
  };
}

// ponytail: 프로세스 하나(systemd)라 메모리 안 줄 세우기로 충분하다. 서버를 여러 대로 늘리면 공유 큐가 필요
let lastStart = 0;
let chain: Promise<unknown> = Promise.resolve();

async function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = lastStart + 1000 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastStart = Date.now();
    return fn();
  });
  chain = run.catch(() => {});
  return run;
}

/** 실제 길을 따라가는 경로. 못 찾거나 실패하면 null */
export function valhallaRoute(from: LatLng, to: LatLng, costing: ValhallaCosting): Promise<RouteResult | null> {
  return throttled(async () => {
    try {
      const res = await fetch(URL_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": ROUTING_USER_AGENT },
        body: JSON.stringify({
          locations: [
            { lat: from.lat, lon: from.lng },
            { lat: to.lat, lon: to.lng },
          ],
          costing,
          units: "kilometers",
        }),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      return res.ok ? parseValhalla(await res.json()) : null;
    } catch {
      return null;
    }
  });
}
