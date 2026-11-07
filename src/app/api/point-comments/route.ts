import { getPool, jsonError, UUID_RE, type Row } from "@/lib/db";
import { listChildren, pointsBelongTo, requireEditBody } from "@/lib/crud";

export async function GET(request: Request) {
  return listChildren(request, "point_comments", "created_at ASC", "댓글");
}

/** 댓글 달기: 편집 권한. 이름(author)은 화면에서 고른 동행자 이름 */
export async function POST(request: Request) {
  try {
    const b = await request.json();
    const denied = await requireEditBody(request, b?.trip_id);
    if (denied) return denied;
    const author = typeof b.author === "string" ? b.author.trim() : "";
    const body = typeof b.body === "string" ? b.body.trim() : "";
    if (!UUID_RE.test(b.point_id ?? "") || !(await pointsBelongTo(b.trip_id, [b.point_id]))) {
      return jsonError("point_id must be a place in this trip", 400);
    }
    if (author.length < 1 || author.length > 20) return jsonError("author must be 1-20 chars", 400);
    if (body.length < 1 || body.length > 500) return jsonError("body must be 1-500 chars", 400);
    const { rows } = await getPool().query<Row>(
      "INSERT INTO triplan.point_comments (trip_id, point_id, author, body) VALUES ($1, $2, $3, $4) RETURNING *",
      [b.trip_id, b.point_id, author, body]
    );
    return Response.json(rows[0]);
  } catch (err) {
    console.error("POST /api/point-comments failed:", err);
    return jsonError("댓글을 남기지 못했어요.");
  }
}
