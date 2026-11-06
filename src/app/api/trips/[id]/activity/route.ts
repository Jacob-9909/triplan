import { getPool, jsonError, UUID_RE, type Row } from "@/lib/db";
import { requireTrip } from "@/lib/auth";

/** 최근 변경 기록 (보기 권한이면 볼 수 있다). ?before=<id> 로 더 이전 기록 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const access = await requireTrip(request, id, "view");
  if (access instanceof Response) return access;
  const before = Number(new URL(request.url).searchParams.get("before"));
  try {
    const { rows } = await getPool().query<Row>(
      `SELECT id::text, actor, action, target, detail, created_at FROM triplan.trip_activity
        WHERE trip_id = $1 AND ($2::bigint IS NULL OR id < $2)
        ORDER BY id DESC LIMIT 40`,
      [id, Number.isFinite(before) && before > 0 ? before : null]
    );
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/trips/[id]/activity failed:", err);
    return jsonError("변경 기록을 불러오지 못했어요.");
  }
}
