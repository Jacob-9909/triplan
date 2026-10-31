import { getPool, jsonError, type Row } from "@/lib/db";
import { currentMember, isAdmin, newToken, requireActor, stripTokens, type Access } from "@/lib/auth";

/**
 * 여행 목록
 * - 관리자: 전부
 * - 사용 회원: 내가 만든 여행(owner) + 초대받은 여행(edit)
 * - 체험 회원: is_demo 여행(view)
 * 각 행에 요청자 권한(access)과 주인 아이디(owner_username)를 붙인다.
 */
export async function GET() {
  try {
    if (await isAdmin()) {
      const { rows } = await getPool().query<Row>(
        `SELECT t.*, m.username AS owner_username, 'admin' AS access
           FROM triplan.trips t LEFT JOIN triplan.members m ON m.id = t.owner_id
          ORDER BY t.start_date ASC NULLS LAST, t.created_at DESC`
      );
      return Response.json(rows);
    }
    const member = await currentMember();
    if (!member) return jsonError("unauthorized", 401);
    if (member.role === "user") {
      const { rows } = await getPool().query<Row>(
        `SELECT t.*, m.username AS owner_username,
                CASE WHEN t.owner_id = $1 THEN 'owner' ELSE 'edit' END AS access
           FROM triplan.trips t LEFT JOIN triplan.members m ON m.id = t.owner_id
          WHERE t.owner_id = $1
             OR EXISTS (SELECT 1 FROM triplan.trip_members tm WHERE tm.trip_id = t.id AND tm.member_id = $1)
          ORDER BY t.start_date ASC NULLS LAST, t.created_at DESC`,
        [member.id]
      );
      return Response.json(rows.map((r) => stripTokens(r, r.access as Access)));
    }
    const { rows } = await getPool().query<Row>(
      `SELECT t.*, 'view' AS access FROM triplan.trips t
        WHERE t.is_demo ORDER BY t.start_date ASC NULLS LAST, t.created_at DESC`
    );
    return Response.json(rows.map((r) => stripTokens(r, "view")));
  } catch (err) {
    console.error("GET /api/trips failed:", err);
    return jsonError("여행 목록을 불러오지 못했어요.");
  }
}

/** 여행 만들기: 관리자와 사용 회원. 회원이 만들면 그 회원이 주인이다 */
export async function POST(request: Request) {
  const actor = await requireActor();
  if (actor instanceof Response) return actor;
  try {
    const b = await request.json();
    if (typeof b?.title !== "string" || !b.title.trim()) {
      return jsonError("title is required", 400);
    }
    const { rows } = await getPool().query<Row>(
      `INSERT INTO triplan.trips
         (title, continent, country, region, start_date, end_date, base_currency, edit_token, view_token, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        b.title.trim(),
        b.continent ?? null,
        b.country ?? null,
        b.region ?? null,
        b.start_date ?? null,
        b.end_date ?? null,
        b.base_currency ?? "KRW",
        newToken(),
        newToken(),
        actor.kind === "user" ? actor.member.id : null,
      ]
    );
    return Response.json({ ...rows[0], access: actor.kind === "user" ? "owner" : "admin" });
  } catch (err) {
    console.error("POST /api/trips failed:", err);
    return jsonError("여행 생성에 실패했어요.");
  }
}
