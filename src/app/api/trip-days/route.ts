import { getPool, jsonError, type Row } from "@/lib/db";
import { listChildren, requireEditBody } from "@/lib/crud";

const WEATHER = ["sunny", "cloudy", "rain", "snow", "wind"];
const MOOD = ["great", "good", "okay", "tired", "bad"];

export async function GET(request: Request) {
  return listChildren(request, "trip_days", "day_number ASC", "하루 기록");
}

/** 하루 기록 저장: (trip_id, day_number) 가 있으면 덮어쓴다 */
export async function POST(request: Request) {
  try {
    const b = await request.json();
    const denied = await requireEditBody(request, b?.trip_id);
    if (denied) return denied;
    if (!(Number.isInteger(b.day_number) && b.day_number >= 1 && b.day_number <= 365)) {
      return jsonError("day_number must be 1-365", 400);
    }
    const weather = b.weather ?? null;
    const mood = b.mood ?? null;
    const note = typeof b.note === "string" ? b.note.trim() || null : null;
    if (weather !== null && !WEATHER.includes(weather)) return jsonError("invalid weather", 400);
    if (mood !== null && !MOOD.includes(mood)) return jsonError("invalid mood", 400);
    if (note && note.length > 5000) return jsonError("note must be 5000 chars or less", 400);
    const { rows } = await getPool().query<Row>(
      `INSERT INTO triplan.trip_days (trip_id, day_number, weather, mood, note)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (trip_id, day_number)
       DO UPDATE SET weather = $3, mood = $4, note = $5, updated_at = now()
       RETURNING *`,
      [b.trip_id, b.day_number, weather, mood, note]
    );
    return Response.json(rows[0]);
  } catch (err) {
    console.error("POST /api/trip-days failed:", err);
    return jsonError("하루 기록을 저장하지 못했어요.");
  }
}
