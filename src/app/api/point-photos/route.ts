import { getPool, jsonError, UUID_RE, type Row } from "@/lib/db";
import { requireTrip, tripIdOf } from "@/lib/auth";

const MAX_BYTES = 2.5 * 1024 * 1024;
const MAX_PER_POINT = 12;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** GET ?point_id= : 사진 목록 (메타데이터만, 이미지 본문은 /api/point-photos/[id]) */
export async function GET(request: Request) {
  const pointId = new URL(request.url).searchParams.get("point_id") ?? "";
  if (!UUID_RE.test(pointId)) return jsonError("invalid point_id", 400);
  const tripId = await tripIdOf("map_points", pointId);
  if (!tripId) return jsonError("not found", 404);
  const access = await requireTrip(request, tripId, "view");
  if (access instanceof Response) return access;
  const { rows } = await getPool().query<Row>(
    "SELECT id, width, height, created_at FROM triplan.point_photos WHERE point_id = $1 ORDER BY created_at ASC",
    [pointId]
  );
  return Response.json(rows);
}

/** POST multipart (point_id, file, width, height): 브라우저에서 줄인 이미지 업로드 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const pointId = String(form.get("point_id") ?? "");
    const file = form.get("file");
    if (!UUID_RE.test(pointId)) return jsonError("invalid point_id", 400);
    if (!(file instanceof File)) return jsonError("file is required", 400);
    if (!TYPES.includes(file.type)) return jsonError("jpg, png, webp만 올릴 수 있어요.", 400);
    if (file.size > MAX_BYTES) return jsonError("사진이 너무 커요 (최대 2.5MB).", 413);

    const tripId = await tripIdOf("map_points", pointId);
    if (!tripId) return jsonError("not found", 404);
    const access = await requireTrip(request, tripId, "edit");
    if (access instanceof Response) return access;

    const { rows: count } = await getPool().query<{ n: number }>(
      "SELECT count(*)::int AS n FROM triplan.point_photos WHERE point_id = $1",
      [pointId]
    );
    if (count[0].n >= MAX_PER_POINT) return jsonError(`장소마다 사진은 ${MAX_PER_POINT}장까지예요.`, 400); // i18n-ignore

    const toInt = (v: FormDataEntryValue | null) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);
    const { rows } = await getPool().query<Row>(
      `INSERT INTO triplan.point_photos (point_id, trip_id, content_type, data, width, height)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, width, height, created_at`,
      [pointId, tripId, file.type, Buffer.from(await file.arrayBuffer()), toInt(form.get("width")), toInt(form.get("height"))]
    );
    return Response.json(rows[0]);
  } catch (err) {
    console.error("POST /api/point-photos failed:", err);
    return jsonError("사진을 올리지 못했어요.");
  }
}
