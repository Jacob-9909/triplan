import type { RouteStep } from "@/lib/types";
import type { LatLng } from "../../features/route/directions.ts";
import type { RouteResult } from "./valhalla.ts";

/**
 * 한국 대중교통 (ODsay LAB 무료 요금제).
 * 약관상 결과를 저장하면 안 되므로, 부를 때마다 화면에만 쓰고 DB에 남기지 않는다.
 * 무료 요금제는 하루 30건이고 키는 등록한 서버 IP에서만 동작한다.
 */

const URL_PATH = "https://api.odsay.com/v1/api/searchPubTransPathT";
export const ODSAY_DAILY_LIMIT = 30;

/** 노선 색: `${subwayCityCode}:${subwayCode}` (수도권 1000, 부산 7000) */
const SUBWAY_COLORS: Record<string, string> = {
  "1000:1": "#0052a4",
  "1000:2": "#00a84d",
  "1000:3": "#ef7c1c",
  "1000:4": "#00a5de",
  "1000:5": "#996cac",
  "1000:6": "#cd7c2f",
  "1000:7": "#747f00",
  "1000:8": "#e6186c",
  "1000:9": "#bdb092",
  "1000:101": "#0090d2", // 공항철도
  "1000:104": "#77c4a3", // 경의중앙
  "1000:108": "#0c8e72", // 경춘
  "1000:109": "#d4003b", // 신분당
  "1000:113": "#b0ce18", // 우이신설
  "1000:116": "#fabe00", // 수인분당
  "7000:1": "#f06a00",
  "7000:2": "#81bf48",
  "7000:3": "#bb8c00",
  "7000:4": "#217dcb",
};
/** 버스 종류(lane.type)별 색: 간선 파랑, 지선 초록, 광역 빨강, 그 밖 파랑 */
const BUS_COLORS: Record<number, string> = { 11: "#3d5bab", 12: "#5bb025", 14: "#e60012", 3: "#5bb025" };
const BUS_DEFAULT = "#3d7be0";

interface OdsaySubPath {
  trafficType: number;
  sectionTime?: number;
  stationCount?: number;
  startName?: string;
  endName?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  lane?: { name?: string; busNo?: string; subwayCode?: number; subwayCityCode?: number; type?: number }[];
  passStopList?: { stations?: { x: string; y: string }[] };
}

function modeOf(trafficType: number): RouteStep["mode"] {
  if (trafficType === 1) return "subway";
  if (trafficType === 2 || trafficType === 5 || trafficType === 6) return "bus";
  if (trafficType === 4) return "rail";
  if (trafficType === 3) return "walk";
  return "other";
}

/** ODsay 경로 검색 응답 → 첫 번째(추천) 경로. 걷기 단계는 앞뒤 좌표로 이은 직선 */
export function parseOdsay(json: unknown, from: LatLng, to: LatLng): RouteResult | null {
  const path = (json as { result?: { path?: { info?: Record<string, number>; subPath?: OdsaySubPath[] }[] } })?.result?.path?.[0];
  if (!path?.info || !Array.isArray(path.subPath)) return null;
  const subs = path.subPath;
  const steps: RouteStep[] = subs.map((s) => {
    const mode = modeOf(s.trafficType);
    if (mode === "walk") return { mode, minutes: s.sectionTime ?? 0, shape: [] };
    const lane = s.lane?.[0] ?? {};
    const stations = s.passStopList?.stations ?? [];
    const line = mode === "bus" ? (lane.busNo ?? null) : (lane.name?.replace(/^(수도권|부산|대구|광주|대전)\s*/, "") ?? null);
    const color =
      mode === "bus"
        ? (BUS_COLORS[lane.type ?? -1] ?? BUS_DEFAULT)
        : (SUBWAY_COLORS[`${lane.subwayCityCode}:${lane.subwayCode}`] ?? null);
    return {
      mode,
      minutes: s.sectionTime ?? 0,
      line,
      color,
      stops: s.stationCount ?? null,
      from: s.startName ?? null,
      to: s.endName ?? null,
      shape: stations.map((st) => [Number(st.x), Number(st.y)] as [number, number]),
    };
  });
  // 걷기 단계: 앞 탈것의 내리는 곳(없으면 출발지) → 뒤 탈것의 타는 곳(없으면 도착지)
  steps.forEach((step, i) => {
    if (step.mode !== "walk") return;
    const prev = subs[i - 1];
    const next = subs[i + 1];
    const a: [number, number] = prev?.endX != null ? [prev.endX, prev.endY!] : [from.lng, from.lat];
    const b: [number, number] = next?.startX != null ? [next.startX, next.startY!] : [to.lng, to.lat];
    step.shape = [a, b];
  });
  return {
    duration_min: path.info.totalTime,
    distance_km: Math.round((path.info.totalDistance ?? 0) / 10) / 100,
    fare_krw: path.info.payment ?? null,
    shape: steps.flatMap((s) => s.shape),
    steps,
  };
}

// ponytail: 하루 호출 수는 메모리에만 센다. 서버를 다시 켜면 0부터라 ODsay 쪽 한도가 마지막 방어선
let counter = { day: "", count: 0 };
const kstDay = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

/** 한국 대중교통 경로. 오늘 한도를 다 썼으면 "quota", 못 찾거나 실패하면 null */
export async function odsayTransit(from: LatLng, to: LatLng): Promise<RouteResult | "quota" | null> {
  const key = process.env.ODSAY_API_KEY;
  if (!key) return null;
  const day = kstDay();
  if (counter.day !== day) counter = { day, count: 0 };
  if (counter.count >= ODSAY_DAILY_LIMIT) return "quota";
  counter.count++;
  try {
    const url = new URL(URL_PATH);
    url.searchParams.set("SX", String(from.lng));
    url.searchParams.set("SY", String(from.lat));
    url.searchParams.set("EX", String(to.lng));
    url.searchParams.set("EY", String(to.lat));
    url.searchParams.set("apiKey", key);
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    const json = await res.json();
    const err = (json as { error?: { message?: string }[] | { message?: string } }).error;
    const message = JSON.stringify(err ?? "");
    if (err && /한도|limit|exceed/i.test(message)) {
      counter.count = ODSAY_DAILY_LIMIT;
      return "quota";
    }
    return parseOdsay(json, from, to);
  } catch {
    return null;
  }
}
