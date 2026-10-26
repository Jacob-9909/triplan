import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { requireTrip, tripIdOf } from "@/lib/auth";
import { deleteChild } from "@/lib/crud";

type Ctx = { params: Promise<{ id: string }> };

/** 이미지 본문. 공유 링크는 <img src="…?t=토큰">으로 접근한다 */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const tripId = await tripIdOf("point_photos", id);
  if (!tripId) return jsonError("not found", 404);
  const access = await requireTrip(request, tripId, "view");
  if (access instanceof Response) return access;
  const { rows } = await getPool().query<{ data: Buffer; content_type: string }>(
    "SELECT data, content_type FROM triplan.point_photos WHERE id = $1",
    [id]
  );
  if (!rows[0]) return jsonError("not found", 404);
  return new Response(new Uint8Array(rows[0].data), {
    headers: {
      "Content-Type": rows[0].content_type,
      // 사진 id는 바뀌지 않으므로 브라우저에 오래 캐시 (권한 있는 사람만 받으므로 private)
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(request: Request, { params }: Ctx) {
  return deleteChild(request, "point_photos", (await params).id);
}
