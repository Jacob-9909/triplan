import { getPool, jsonError } from "@/lib/db";
import { canUseExternalApis } from "@/lib/auth";
import { requireEditBody } from "@/lib/crud";
import { nimChat } from "@/lib/nim";
import { parseSuggestions, SUGGEST_SCHEMA, type Suggestion } from "@/lib/aiAssist";
import { ROUTING_USER_AGENT } from "@/lib/routing/valhalla";
import { getTripCenter } from "@/data/countryCenters";
import { haversineKm } from "@/features/route/directions";

/** 여행 중심에서 이보다 먼 곳은 다른 도시의 같은 이름으로 보고 버린다 */
const MAX_KM = 50;

/** Photon 으로 위치 확인: 여행 중심 쪽을 우선해 첫 결과. 없으면 null */
async function geocode(q: string, lat: number, lng: number): Promise<{ lat: number; lng: number; address: string } | null> {
  try {
    const u = new URL("https://photon.komoot.io/api/");
    u.searchParams.set("q", q);
    u.searchParams.set("limit", "1");
    u.searchParams.set("lat", String(lat));
    u.searchParams.set("lon", String(lng));
    u.searchParams.set("zoom", "12");
    const res = await fetch(u, { headers: { "User-Agent": ROUTING_USER_AGENT }, signal: AbortSignal.timeout(6000), cache: "no-store" });
    const f = (await res.json())?.features?.[0];
    const [x, y] = f?.geometry?.coordinates ?? [];
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const p = f.properties ?? {};
    return { lat: y, lng: x, address: [p.street, p.district, p.city].filter(Boolean).join(", ") };
  } catch {
    return null;
  }
}

const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

/**
 * 후보 장소 추천: NIM 이 고르고, Photon 으로 실제 위치를 확인한 곳만 돌려준다.
 * 이미 넣은 장소(같은 이름이거나 50m 안)는 뺀다. 저장은 화면에서 고른 것만 후보함에.
 */
export async function POST(request: Request) {
  try {
    const b = await request.json();
    const denied = await requireEditBody(request, b?.trip_id);
    if (denied) return denied;
    if (!(await canUseExternalApis(request))) return jsonError("체험 계정에서는 쓸 수 없어요.", 403);
    const interests: string[] = Array.isArray(b.interests) ? b.interests.filter((s: unknown) => typeof s === "string").slice(0, 10) : [];
    if (interests.some((s) => s.length > 20)) return jsonError("interests must be short words", 400);
    const note = typeof b.note === "string" ? b.note.trim().slice(0, 200) : "";
    const locale = b.locale === "en" ? "en" : "ko";

    const pool = getPool();
    const trip = (await pool.query<{ country: string | null; region: string | null }>("SELECT country, region FROM triplan.trips WHERE id = $1", [b.trip_id])).rows[0];
    const existing = (await pool.query<{ name: string; lat: number; lng: number }>("SELECT name, lat, lng FROM triplan.map_points WHERE trip_id = $1", [b.trip_id])).rows;
    const center = existing.length
      ? { lat: existing.reduce((s, p) => s + p.lat, 0) / existing.length, lng: existing.reduce((s, p) => s + p.lng, 0) / existing.length }
      : getTripCenter(trip?.country, trip?.region);
    if (!center || !trip?.country) return jsonError("여행지를 먼저 정해 주세요.", 400);

    const region = [trip.region, trip.country].filter(Boolean).join(", ");
    const raw = await nimChat({
      name: "place_suggestions",
      system: "You are a careful local travel guide. Suggest only real, currently operating places. Reply with JSON only.",
      user:
        `Destination: ${region}.\n` +
        `Traveler interests: ${interests.join(", ") || "anything popular"}.\n` +
        (note ? `Traveler note: ${note}\n` : "") +
        `Already planned (do not repeat): ${existing.map((p) => p.name).slice(0, 40).join(", ") || "none"}.\n` +
        `Suggest 8 specific places (not areas or cities) within the destination. For each: name in ${locale === "ko" ? "Korean" : "English"}, ` +
        `local = the official name in the local language as written on maps, ` +
        `category (attraction for sights, viewpoints and observation decks; food for restaurants and food markets; cafe; ` +
        `shopping only for shops and malls; nature for parks and gardens; culture for museums, temples and shrines; etc otherwise), and reason = at most 40 characters in ${locale === "ko" ? "Korean" : "English"} on why it fits.`,
      schema: SUGGEST_SCHEMA,
      maxTokens: 900,
      temperature: 0.4,
      // 보통 몇 초지만 무료 엔드포인트라 붐비면 길어진다. 화면은 "고르는 중" 을 보여 준다
      timeoutMs: 60_000,
    });
    if (!raw) return jsonError("AI 추천을 받지 못했어요. 잠시 뒤 다시 해 보세요.", 502);
    const list = parseSuggestions(raw);

    const known = new Set(existing.map((p) => norm(p.name)));
    const places: (Suggestion & { lat: number; lng: number; address: string })[] = [];
    // ponytail: Photon 공용 서버라 4곳씩 나눠 묻는다
    for (let i = 0; i < list.length; i += 4) {
      const batch = list.slice(i, i + 4).filter((s) => !known.has(norm(s.name)) && !known.has(norm(s.local)));
      const found = await Promise.all(batch.map((s) => geocode(s.local, center.lat, center.lng)));
      batch.forEach((s, j) => {
        const g = found[j];
        if (!g || haversineKm(center, g) > MAX_KM) return;
        if (existing.some((p) => haversineKm(p, g) < 0.05) || places.some((p) => haversineKm(p, g) < 0.05)) return;
        places.push({ ...s, ...g });
      });
    }
    return Response.json({ places, dropped: list.length - places.length });
  } catch (err) {
    console.error("POST /api/ai/suggest failed:", err);
    return jsonError("AI 추천을 받지 못했어요. 잠시 뒤 다시 해 보세요.");
  }
}
