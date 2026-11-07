import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { listChildren, pointsBelongTo, requireEditBody } from "@/lib/crud";

export async function GET(request: Request) {
  return listChildren(request, "point_votes", "created_at ASC", "좋아요");
}

/** 좋아요 켜기·끄기: { trip_id, point_id, voter, on } — 이름마다 장소당 하나 */
export async function POST(request: Request) {
  try {
    const b = await request.json();
    const denied = await requireEditBody(request, b?.trip_id);
    if (denied) return denied;
    const voter = typeof b.voter === "string" ? b.voter.trim() : "";
    if (!UUID_RE.test(b.point_id ?? "") || !(await pointsBelongTo(b.trip_id, [b.point_id]))) {
      return jsonError("point_id must be a place in this trip", 400);
    }
    if (voter.length < 1 || voter.length > 20) return jsonError("voter must be 1-20 chars", 400);
    await getPool().query(
      b.on === false
        ? "DELETE FROM triplan.point_votes WHERE point_id = $2 AND voter = $3 AND trip_id = $1"
        : "INSERT INTO triplan.point_votes (trip_id, point_id, voter) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [b.trip_id, b.point_id, voter]
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/point-votes failed:", err);
    return jsonError("좋아요를 저장하지 못했어요.");
  }
}
