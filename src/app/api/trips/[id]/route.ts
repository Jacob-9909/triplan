import { getPool, jsonError } from "@/lib/db";

type Row = Record<string, unknown>;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  try {
    const { rows } = await getPool().query<Row>(
      "SELECT * FROM triplan.trips WHERE id = $1",
      [id]
    );
    return Response.json(rows[0] ?? null);
  } catch (err) {
    console.error("GET /api/trips/[id] failed:", err);
    return jsonError("여행을 불러오지 못했어요.");
  }
}
