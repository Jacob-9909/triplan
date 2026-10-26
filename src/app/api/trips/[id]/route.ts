import { getPool, jsonError, UUID_RE, type Row } from "@/lib/db";
import { requireAdmin, requireTrip, stripTokens } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const access = await requireTrip(request, id, "view");
  if (access instanceof Response) return access;
  try {
    const { rows } = await getPool().query<Row>("SELECT * FROM triplan.trips WHERE id = $1", [id]);
    if (!rows[0]) return jsonError("not found", 404);
    return Response.json({ ...stripTokens(rows[0], access), access });
  } catch (err) {
    console.error("GET /api/trips/[id] failed:", err);
    return jsonError("여행을 불러오지 못했어요.");
  }
}

/** 제목·날짜 등 수정: 편집 링크도 가능 */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const access = await requireTrip(request, id, "edit");
  if (access instanceof Response) return access;
  try {
    const b = await request.json();
    const allowed = ["title", "continent", "country", "region", "start_date", "end_date", "base_currency"] as const;
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const key of allowed) {
      if (b?.[key] !== undefined) {
        sets.push(`${key} = $${sets.length + 1}`);
        vals.push(b[key]);
      }
    }
    if (!sets.length) return jsonError("no fields to update", 400);
    vals.push(id);
    const { rows } = await getPool().query<Row>(
      `UPDATE triplan.trips SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return Response.json({ ...stripTokens(rows[0], access), access });
  } catch (err) {
    console.error("PATCH /api/trips/[id] failed:", err);
    return jsonError("여행 수정에 실패했어요.");
  }
}

/** 여행 삭제는 관리자만 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    // 위시리스트에서 전환된 여행이면 연결만 끊긴다 (on delete set null)
    await getPool().query("DELETE FROM triplan.trips WHERE id = $1", [id]);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/trips/[id] failed:", err);
    return jsonError("여행 삭제에 실패했어요.");
  }
}
