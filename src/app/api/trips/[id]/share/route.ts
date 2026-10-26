import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { newToken, requireAdmin } from "@/lib/auth";

/**
 * 공유 링크 재발급 (관리자 전용). 이전 링크는 즉시 무효가 된다.
 * body: { kind: "edit" | "view" | "both" }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { kind = "both" } = await request.json().catch(() => ({}));
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (kind === "edit" || kind === "both") {
      sets.push(`edit_token = $${sets.length + 1}`);
      vals.push(newToken());
    }
    if (kind === "view" || kind === "both") {
      sets.push(`view_token = $${sets.length + 1}`);
      vals.push(newToken());
    }
    if (!sets.length) return jsonError("kind must be edit, view, or both", 400);
    vals.push(id);
    const { rows } = await getPool().query<{ edit_token: string; view_token: string }>(
      `UPDATE triplan.trips SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING edit_token, view_token`,
      vals
    );
    if (!rows[0]) return jsonError("not found", 404);
    return Response.json(rows[0]);
  } catch (err) {
    console.error("POST /api/trips/[id]/share failed:", err);
    return jsonError("공유 링크를 바꾸지 못했어요.");
  }
}
