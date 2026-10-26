import { NextResponse } from "next/server";
import { canUseExternalApis as allowed } from "@/lib/auth";
import { LANG_RE, MAX_NAME_LENGTH, translateNames } from "@/lib/translate";

/**
 * 장소 이름 한국어 번역 (DB 캐시 + MyMemory 무료 API).
 * 무료 한도를 남이 쓰지 못하게 관리자나 공유 링크 소지자만 호출할 수 있다.
 * - GET ?q=&from=   장소 추가 창의 이름 하나
 * - POST {names, from}   지도 라벨 여러 개 (최대 40개)
 */

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const invalid = () => NextResponse.json({ error: "Invalid query" }, { status: 400 });

export async function GET(request: Request) {
  if (!(await allowed(request))) return unauthorized();
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const from = url.searchParams.get("from") ?? "autodetect";
  if (!q || q.length > MAX_NAME_LENGTH || !LANG_RE.test(from)) return invalid();
  const { translations } = await translateNames([q], from);
  return NextResponse.json({ text: translations[q] ?? null });
}

export async function POST(request: Request) {
  if (!(await allowed(request))) return unauthorized();
  const body = await request.json().catch(() => null);
  const names: unknown = body?.names;
  const from: unknown = body?.from ?? "autodetect";
  if (
    !Array.isArray(names) ||
    names.length === 0 ||
    names.length > 40 ||
    !names.every((n) => typeof n === "string") ||
    typeof from !== "string" ||
    !LANG_RE.test(from)
  ) {
    return invalid();
  }
  return NextResponse.json(await translateNames(names as string[], from));
}
