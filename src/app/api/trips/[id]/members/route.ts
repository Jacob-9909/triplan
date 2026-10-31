import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { currentMember, requireTrip } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/** 함께 편집하는 회원 목록 (주인 포함). 편집 권한이 있으면 볼 수 있다 */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const access = await requireTrip(request, id, "edit");
  if (access instanceof Response) return access;
  const { rows } = await getPool().query(
    `SELECT m.id, m.username, 'owner' AS kind FROM triplan.trips t JOIN triplan.members m ON m.id = t.owner_id WHERE t.id = $1
     UNION ALL
     SELECT m.id, m.username, 'invited' AS kind FROM triplan.trip_members tm JOIN triplan.members m ON m.id = tm.member_id
      WHERE tm.trip_id = $1`,
    [id]
  );
  return Response.json(rows);
}

/** 초대: 주인·관리자가 사용 권한 회원을 아이디로 초대한다. body: { username } */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const access = await requireTrip(request, id, "manage");
  if (access instanceof Response) return access;
  const b = await request.json().catch(() => null);
  const username = typeof b?.username === "string" ? b.username.trim() : "";
  if (!username) return jsonError("아이디를 입력해 주세요.", 400);
  const { rows } = await getPool().query<{ id: string; username: string; role: string; is_owner: boolean }>(
    `SELECT m.id, m.username, m.role, (t.owner_id = m.id) AS is_owner
       FROM triplan.members m, triplan.trips t
      WHERE lower(m.username) = lower($1) AND t.id = $2`,
    [username, id]
  );
  const target = rows[0];
  // 체험 계정과 없는 아이디는 같은 메시지로 답해 회원 목록을 떠보지 못하게 한다
  if (!target || target.role !== "user") return jsonError("초대할 수 있는 회원을 찾지 못했어요.", 404);
  if (target.is_owner) return jsonError("이 여행의 주인이에요.", 400);
  await getPool().query(
    "INSERT INTO triplan.trip_members (trip_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [id, target.id]
  );
  return Response.json({ id: target.id, username: target.username, kind: "invited" });
}

/** 초대 취소: 주인·관리자는 누구든, 초대받은 회원은 자기 자신만(나가기). ?member_id=<id> 또는 ?member_id=me */
export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  const me = await currentMember();
  const param = new URL(request.url).searchParams.get("member_id") ?? "";
  const memberId = param === "me" ? (me?.id ?? "") : param;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  if (!UUID_RE.test(memberId)) return jsonError(param === "me" ? "unauthorized" : "invalid member_id", param === "me" ? 401 : 400);
  if (me?.id !== memberId) {
    const access = await requireTrip(request, id, "manage");
    if (access instanceof Response) return access;
  }
  await getPool().query("DELETE FROM triplan.trip_members WHERE trip_id = $1 AND member_id = $2", [id, memberId]);
  return Response.json({ ok: true });
}
