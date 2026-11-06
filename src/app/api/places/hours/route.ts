import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { canUseExternalApis, requireTrip } from "@/lib/auth";
import { pickOsmPlace, type OsmPlace } from "@/features/route/openingHours";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
/** Overpass 이용 조건: 앱을 밝히는 User-Agent */
const USER_AGENT = "Triplan/1.0 (travel planner)";

interface OverpassElement {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Overpass 를 기다리는 시간. 넘기면 실패로 보고 다음에 다시 찾는다.
 * 공용 서버가 붐비면 30초 가까이 걸려서, 사람이 기다리지 않는 백그라운드 조회(patient)는 길게 기다린다.
 * 장소 상세의 "찾기" 버튼은 짧게 (버튼이 오래 돌지 않게)
 */
const TIMEOUT_MS = 10_000;
const PATIENT_TIMEOUT_MS = 40_000;

/** 좌표 80 m 안에서 이름과 opening_hours 가 있는 OSM 장소. 실패하면 null (저장하지 않고 다음에 다시) */
async function nearbyPlaces(lat: number, lng: number, timeoutMs: number): Promise<OsmPlace[] | null> {
  const around = `around:80,${lat},${lng}`;
  // 노선(relation type=route)도 opening_hours 를 달고 있어서, relation 은 넓은 장소(multipolygon)만 본다
  const query =
    `[out:json][timeout:${Math.floor(timeoutMs / 1000) - 1}];(nw(${around})["opening_hours"]["name"];` +
    `rel(${around})["opening_hours"]["name"]["type"="multipolygon"];);out center tags 40;`;
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`Overpass ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { elements?: OverpassElement[]; remark?: string };
    // 시간 초과 같은 실행 오류도 200 으로 오고 remark 에만 남는다
    if (!Array.isArray(json.elements) || /error|timed out/i.test(json.remark ?? "")) {
      console.warn("Overpass remark:", json.remark);
      return null;
    }
    return json.elements.flatMap((e) => {
      const at = e.center ?? (e.lat !== undefined && e.lon !== undefined ? { lat: e.lat, lon: e.lon } : null);
      return at && e.tags ? [{ tags: e.tags, lat: at.lat, lng: at.lon }] : [];
    });
  } catch (err) {
    console.warn("Overpass failed:", err instanceof Error ? err.name : err);
    return null;
  }
}

/**
 * 장소 영업시간을 OpenStreetMap 에서 찾아 저장한다. 본문 { point_id, patient? }.
 * 찾지 못하면 '' 로 남겨 다시 묻지 않는다. 다만 사용자가 적어 둔 값은 지우지 않는다.
 * Overpass 가 실패하면 502 를 주고 저장하지 않는다 (나중에 다시 찾는다).
 */
export async function POST(request: Request) {
  try {
    const b = await request.json();
    const id = b?.point_id;
    if (typeof id !== "string" || !UUID_RE.test(id)) return jsonError("invalid point_id", 400);
    const { rows } = await getPool().query<{ trip_id: string; name: string; lat: number; lng: number }>(
      "SELECT trip_id, name, lat, lng FROM triplan.map_points WHERE id = $1",
      [id]
    );
    const point = rows[0];
    if (!point) return jsonError("not found", 404);
    const access = await requireTrip(request, point.trip_id, "edit");
    if (access instanceof Response) return access;
    if (!(await canUseExternalApis(request))) return jsonError("체험 계정에서는 쓸 수 없어요.", 403);

    const places = await nearbyPlaces(Number(point.lat), Number(point.lng), b?.patient === true ? PATIENT_TIMEOUT_MS : TIMEOUT_MS);
    if (!places) return jsonError("OpenStreetMap에서 영업시간을 가져오지 못했어요.", 502);
    const found = pickOsmPlace(places, point.name, { lat: Number(point.lat), lng: Number(point.lng) });
    const hours = found?.tags.opening_hours.trim().slice(0, 200) ?? "";

    const saved = await getPool().query<{ opening_hours: string | null }>(
      `UPDATE triplan.map_points
          SET opening_hours = CASE WHEN $1 = '' THEN coalesce(opening_hours, '') ELSE $1 END
        WHERE id = $2 RETURNING opening_hours`,
      [hours, id]
    );
    return Response.json({ opening_hours: saved.rows[0]?.opening_hours ?? hours, found: hours !== "" });
  } catch (err) {
    console.error("POST /api/places/hours failed:", err);
    return jsonError("영업시간을 찾지 못했어요.");
  }
}
