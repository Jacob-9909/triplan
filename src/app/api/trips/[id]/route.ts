import { getPool, jsonError, UUID_RE, type Row } from "@/lib/db";
import { requireTrip, stripTokens } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const access = await requireTrip(request, id, "view");
  if (access instanceof Response) return access;
  try {
    const { rows } = await getPool().query<Row>(
      `SELECT t.*, m.username AS owner_username
         FROM triplan.trips t LEFT JOIN triplan.members m ON m.id = t.owner_id WHERE t.id = $1`,
      [id]
    );
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
    const allowed = ["title", "continent", "country", "region", "start_date", "end_date", "base_currency"];
    // 체험 회원 공개 여부는 관리자만 바꾼다
    if (access === "admin") allowed.push("is_demo");
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
      `UPDATE triplan.trips t SET ${sets.join(", ")} WHERE id = $${vals.length}
       RETURNING t.*, (SELECT username FROM triplan.members WHERE id = t.owner_id) AS owner_username`,
      vals
    );
    return Response.json({ ...stripTokens(rows[0], access), access });
  } catch (err) {
    console.error("PATCH /api/trips/[id] failed:", err);
    return jsonError("여행 수정에 실패했어요.");
  }
}

/** 여행 삭제는 관리자와 주인만 */
export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const access = await requireTrip(request, id, "manage");
  if (access instanceof Response) return access;
  try {
    // 위시리스트에서 전환된 여행이면 연결만 끊긴다 (on delete set null)
    await getPool().query("DELETE FROM triplan.trips WHERE id = $1", [id]);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/trips/[id] failed:", err);
    return jsonError("여행 삭제에 실패했어요.");
  }
}
