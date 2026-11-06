import { jsonError, UUID_RE } from "@/lib/db";
import { requireTrip } from "@/lib/auth";
import { getLocale } from "@/i18n/server";
import { loadRecap, recapPng } from "@/lib/og/recap";
import { pngResponse } from "@/lib/og/parts";

/**
 * 회고 카드 PNG (1080×1350). 볼 수 있는 사람이면 누구나 (공유 링크는 ?t=<토큰>, <img src> 용).
 * ?download=1 이면 파일로 내려받게 한다.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const access = await requireTrip(request, id, "view");
  if (access instanceof Response) return access;
  try {
    const data = await loadRecap(id);
    if (!data) return jsonError("not found", 404);
    const png = await recapPng(data, await getLocale());
    if (!png) return jsonError("회고 카드를 만들지 못했어요.");
    const download = new URL(request.url).searchParams.get("download") === "1";
    return pngResponse(png, {
      // 권한이 필요한 이미지라 공유 캐시에 남기지 않는다
      "Cache-Control": "private, no-store",
      ...(download ? { "Content-Disposition": 'attachment; filename="triplan-recap.png"' } : {}),
    });
  } catch (err) {
    console.error("GET /api/trips/[id]/recap failed:", err);
    return jsonError("회고 카드를 만들지 못했어요.");
  }
}
