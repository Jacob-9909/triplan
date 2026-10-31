import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { requireTrip } from "@/lib/auth";

/** 폴링용: 여행 데이터가 바뀔 때마다 올라가는 번호. SSE 가 안 될 때 클라이언트가 몇 초마다 확인한다 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const access = await requireTrip(request, id, "view");
  if (access instanceof Response) return access;
  const { rows } = await getPool().query<{ rev: string }>("SELECT rev::text FROM triplan.trips WHERE id = $1", [id]);
  if (!rows[0]) return jsonError("not found", 404);
  return Response.json({ rev: Number(rows[0].rev) }, { headers: { "Cache-Control": "no-store" } });
}
