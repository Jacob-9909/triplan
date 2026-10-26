import { NextResponse } from "next/server";
import { TOKEN_HEADER, findTripByToken, isAdmin } from "@/lib/auth";

/**
 * 장소 이름 한국어 번역 프록시 (MyMemory 무료 API, 키 불필요).
 * 무료 한도를 남이 쓰지 못하게 관리자나 편집 링크 소지자만 호출할 수 있다.
 */

const LANG_RE = /^(autodetect|[a-z]{2}(-[A-Z]{2})?)$/;
const HANGUL_RE = /[가-힣]/;
const cache = new Map<string, string | null>();

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    const token = request.headers.get(TOKEN_HEADER);
    const found = token ? await findTripByToken(token) : null;
    if (found?.access !== "edit") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const from = url.searchParams.get("from") ?? "autodetect";
  if (!q || q.length > 100 || !LANG_RE.test(from)) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  if (HANGUL_RE.test(q)) return NextResponse.json({ text: null });

  const key = `${from}:${q}`;
  if (cache.has(key)) return NextResponse.json({ text: cache.get(key) });

  const api = new URL("https://api.mymemory.translated.net/get");
  api.searchParams.set("q", q);
  api.searchParams.set("langpair", `${from}|ko`);
  try {
    const res = await fetch(api, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    const data = res.ok ? await res.json() : null;
    const text: unknown = data?.responseData?.translatedText;
    // 번역이 안 됐거나(원문 그대로·한글 없음) 한도 초과면 null
    const ok = typeof text === "string" && HANGUL_RE.test(text) && text !== q && !data?.quotaFinished;
    const result = ok ? (text as string).trim() : null;
    if (cache.size > 2000) cache.clear();
    cache.set(key, result);
    return NextResponse.json({ text: result });
  } catch {
    return NextResponse.json({ text: null });
  }
}
