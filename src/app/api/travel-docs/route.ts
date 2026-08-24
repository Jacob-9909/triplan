import { getPool, jsonError } from "@/lib/db";

type Row = Record<string, unknown>;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const tripId = new URL(request.url).searchParams.get("trip_id") ?? "";
  if (!UUID_RE.test(tripId)) return jsonError("invalid trip_id", 400);
  try {
    const { rows } = await getPool().query<Row>(
      "SELECT * FROM triplan.travel_docs WHERE trip_id = $1 ORDER BY starts_at ASC NULLS LAST",
      [tripId]
    );
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/travel-docs failed:", err);
    return jsonError("문서를 불러오지 못했어요.");
  }
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    for (const key of ["trip_id", "title"]) {
      if (!b?.[key]) return jsonError(`${key} is required`, 400);
    }
    const { rows } = await getPool().query<Row>(
      `INSERT INTO triplan.travel_docs
         (trip_id, type, title, provider, confirmation_code, url, starts_at, ends_at, file_path)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        b.trip_id,
        b.type ?? "etc",
        b.title,
        b.provider ?? null,
        b.confirmation_code ?? null,
        b.url ?? null,
        b.starts_at ?? null,
        b.ends_at ?? null,
        b.file_path ?? null,
      ]
    );
    return Response.json(rows[0]);
  } catch (err) {
    console.error("POST /api/travel-docs failed:", err);
    return jsonError("문서 추가에 실패했어요.");
  }
}
