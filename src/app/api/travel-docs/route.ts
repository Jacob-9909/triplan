import { getPool, jsonError, type Row } from "@/lib/db";
import { listChildren, requireEditBody } from "@/lib/crud";

export async function GET(request: Request) {
  // 보기 전용 링크에는 예약번호와 예약 링크를 내보내지 않는다
  return listChildren(request, "travel_docs", "starts_at ASC NULLS LAST", "예약 문서", (rows, access) =>
    access === "view" ? rows.map((r) => ({ ...r, confirmation_code: null, url: null })) : rows
  );
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    if (!b?.title) return jsonError("title is required", 400);
    const denied = await requireEditBody(request, b.trip_id);
    if (denied) return denied;
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
        typeof b.url === "string" && /^https?:\/\//i.test(b.url) ? b.url : null,
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
