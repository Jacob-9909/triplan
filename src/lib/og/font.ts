import { glyphSet, parseFontCss } from "./logic";

// ImageResponse 기본 폰트에는 한글이 없다. Google Fonts 에서 쓰는 글자만 받아(text= 서브셋) 메모리에 둔다

export const OG_FONT = "Noto Sans KR";

type Weight = 500 | 800;
export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: Weight;
  style: "normal";
}

// 옛 브라우저 UA 로 물어야 woff2 대신 satori 가 읽는 ttf 를 준다
const OLD_UA =
  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1";
const WEIGHTS: Weight[] = [500, 800];
const MAX_CACHED = 48;
// 서버가 오프라인이면 요청마다 기다리지 않게 잠시 쉬었다가 다시 시도한다
const RETRY_AFTER_MS = 60_000;

const cache = new Map<string, Promise<OgFont[]>>();
let offlineUntil = 0;

async function download(subset: string): Promise<OgFont[]> {
  const family = `${OG_FONT.replace(/ /g, "+")}:wght@${WEIGHTS.join(";")}`;
  const cssRes = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(subset)}`,
    { headers: { "User-Agent": OLD_UA }, signal: AbortSignal.timeout(4000) }
  );
  if (!cssRes.ok) throw new Error(`font css ${cssRes.status}`);
  const files = parseFontCss(await cssRes.text()).filter((f): f is { weight: Weight; url: string } =>
    WEIGHTS.includes(f.weight as Weight)
  );
  if (!files.length) throw new Error("no usable font in css");
  return Promise.all(
    files.map(async ({ weight, url }) => {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`font file ${res.status}`);
      return { name: OG_FONT, data: await res.arrayBuffer(), weight, style: "normal" as const };
    })
  );
}

/**
 * 이미지에 쓸 글자들로 한글 폰트(500·800)를 받는다. 실패하면 undefined:
 * 그때는 ImageResponse 기본 폰트로 그린다 (한글은 빠질 수 있다).
 */
export async function koreanFonts(...texts: (string | null | undefined)[]): Promise<OgFont[] | undefined> {
  if (Date.now() < offlineUntil) return undefined;
  const subset = glyphSet(...texts);
  let pending = cache.get(subset);
  if (!pending) {
    pending = download(subset);
    cache.set(subset, pending);
    // 오래된 것부터 버린다 (Map 은 넣은 순서를 지킨다)
    if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
  }
  try {
    return await pending;
  } catch (err) {
    cache.delete(subset);
    offlineUntil = Date.now() + RETRY_AFTER_MS;
    console.warn("og font download failed, falling back to the default font:", err);
    return undefined;
  }
}
