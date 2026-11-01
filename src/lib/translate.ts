import { getPool } from "./db";

/**
 * 장소 이름 → 한국어 번역 (MyMemory 무료 API, 키 불필요).
 * 결과는 triplan.name_translations에 저장해 다음부터는 DB에서 바로 꺼낸다.
 * MYMEMORY_EMAIL이 있으면 하루 한도가 5천 자에서 5만 자로 늘어난다.
 */

export const HANGUL_RE = /[가-힣]/; // i18n-ignore
export const LANG_RE = /^(autodetect|[a-z]{2}(-[A-Z]{2})?)$/;
export const MAX_NAME_LENGTH = 100;

type Outcome = { ko: string | null } | { quota: true } | { error: true };

async function askMyMemory(name: string, from: string): Promise<Outcome> {
  const api = new URL("https://api.mymemory.translated.net/get");
  api.searchParams.set("q", name);
  api.searchParams.set("langpair", `${from}|ko`);
  if (process.env.MYMEMORY_EMAIL) api.searchParams.set("de", process.env.MYMEMORY_EMAIL);
  try {
    const res = await fetch(api, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    const data = await res.json().catch(() => null);
    if (data?.quotaFinished || res.status === 429) return { quota: true };
    if (!res.ok || !data) return { error: true };
    const text: unknown = data.responseData?.translatedText;
    // 원문 그대로이거나 한글이 없으면 번역 실패로 기록한다
    const ok = typeof text === "string" && HANGUL_RE.test(text) && text.trim() !== name;
    return { ko: ok ? (text as string).trim() : null };
  } catch {
    return { error: true };
  }
}

/**
 * 이름 여러 개를 번역한다. 캐시에 없는 것만 API에 묻고(동시 4개),
 * 한도가 차면 남은 이름은 묻지 않고 quota=true로 알린다.
 */
export async function translateNames(
  names: string[],
  from: string
): Promise<{ translations: Record<string, string | null>; quota: boolean }> {
  const wanted = [...new Set(names.map((n) => n.trim()))].filter(
    (n) => n && n.length <= MAX_NAME_LENGTH && !HANGUL_RE.test(n)
  );
  const translations: Record<string, string | null> = {};
  if (wanted.length === 0) return { translations, quota: false };

  const pool = getPool();
  const { rows } = await pool.query<{ source: string; ko: string | null }>(
    "SELECT source, ko FROM triplan.name_translations WHERE source = ANY($1)",
    [wanted]
  );
  for (const r of rows) translations[r.source] = r.ko;

  const misses = wanted.filter((n) => !(n in translations));
  let quota = false;
  const fresh: Array<[string, string | null]> = [];
  let next = 0;
  async function worker() {
    while (!quota && next < misses.length) {
      const name = misses[next++];
      const out = await askMyMemory(name, from);
      if ("quota" in out) quota = true;
      else if ("ko" in out) {
        translations[name] = out.ko;
        fresh.push([name, out.ko]);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, misses.length) }, worker));

  if (fresh.length > 0) {
    await pool
      .query(
        `INSERT INTO triplan.name_translations (source, ko)
         SELECT * FROM unnest($1::text[], $2::text[])
         ON CONFLICT (source) DO NOTHING`,
        [fresh.map((f) => f[0]), fresh.map((f) => f[1])]
      )
      .catch(() => {});
  }
  return { translations, quota };
}
