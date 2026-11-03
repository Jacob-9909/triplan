import { jsonError } from "@/lib/db";
import { canUseExternalApis } from "@/lib/auth";
import { requireEditBody } from "@/lib/crud";
import { nimAreaNames } from "@/lib/nim";
import { ROUTING_USER_AGENT } from "@/lib/routing/valhalla";

interface Group {
  places: string[];
  lat: number;
  lng: number;
}

/** 구역 중심의 동네 이름 (Photon 역지오코딩). 실패하면 null */
async function photonName(g: Group, locale: "ko" | "en"): Promise<string | null> {
  try {
    const url = new URL("https://photon.komoot.io/reverse");
    url.searchParams.set("lat", String(g.lat));
    url.searchParams.set("lon", String(g.lng));
    url.searchParams.set("lang", locale === "ko" ? "default" : "en");
    const res = await fetch(url, { headers: { "User-Agent": ROUTING_USER_AGENT }, signal: AbortSignal.timeout(5000), cache: "no-store" });
    const p = (await res.json())?.features?.[0]?.properties;
    const name = p?.district ?? p?.locality ?? p?.suburb ?? p?.city;
    return typeof name === "string" && name ? name.slice(0, 30) : null;
  } catch {
    return null;
  }
}

/**
 * 후보함 구역 이름 짓기. 묶기는 화면에서 계산하고, 여기서는 이름만 붙인다.
 * NIM 이 먼저, 못 지은 구역은 Photon 동네 이름, 그것도 없으면 null (화면이 "구역 N" 으로 보여 준다).
 */
export async function POST(request: Request) {
  try {
    const b = await request.json();
    const denied = await requireEditBody(request, b?.trip_id);
    if (denied) return denied;
    if (!(await canUseExternalApis(request))) return jsonError("체험 계정에서는 쓸 수 없어요.", 403);
    const groups: Group[] = Array.isArray(b.groups) ? b.groups : [];
    const valid =
      groups.length >= 1 &&
      groups.length <= 12 &&
      groups.every(
        (g) =>
          Array.isArray(g?.places) &&
          g.places.length >= 1 &&
          g.places.length <= 30 &&
          g.places.every((n) => typeof n === "string" && n.length <= 100) &&
          Number.isFinite(g.lat) &&
          Number.isFinite(g.lng)
      );
    if (!valid) return jsonError("groups must be 1-12 groups of 1-30 place names", 400);
    const locale = b.locale === "en" ? "en" : "ko";
    const region = typeof b.region === "string" ? b.region.slice(0, 60) : "";

    const fromNim = await nimAreaNames(groups, region, locale);
    const names = await Promise.all(groups.map(async (g, i) => fromNim?.[i] ?? (await photonName(g, locale))));
    return Response.json({ names });
  } catch (err) {
    console.error("POST /api/areas/name failed:", err);
    return jsonError("구역 이름을 짓지 못했어요.");
  }
}
