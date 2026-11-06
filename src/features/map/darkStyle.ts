/**
 * 밤 지도: 낮 지도 스타일(OpenFreeMap Liberty, 실패 시 Carto)의 색만 바꿔 다크 모드에 맞춘다.
 * 예전에는 지도 그림 전체를 CSS 로 반전했는데, 그러면 흰 길이 배경보다 어두워지고
 * 주황 도로가 갈색으로, 장소 아이콘 색까지 뒤집혔다. 여기서는 레이어 종류마다 색을 정한다:
 * 배경은 앱 다크 배경(남색), 길은 배경보다 밝게, 글씨는 종이색, 아이콘(스프라이트)은 그대로.
 * 스타일 JSON 만 바꾸므로 레이어 id·POI 클릭·한국어 라벨은 그대로 동작한다.
 */

type Layer = Record<string, unknown> & { id: string; type: string; paint?: Record<string, unknown> };

/** globals.css 다크 --background 와 같은 색 */
export const NIGHT_BG = "#0f1726";
const HALO = "rgba(15,23,38,0.85)";

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** #rgb·#rrggbb(aa)·rgb(a)·hsl(a) 를 읽는다. 색이 아니면 null */
export function parseColor(text: string): Rgba | null {
  const s = text.trim().toLowerCase();
  const hex = s.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const fn = s.match(/^(rgba?|hsla?)\(([^)]+)\)$/);
  if (!fn) return null;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  const num = (v: string) => parseFloat(v);
  const a = parts[3] !== undefined ? (parts[3].endsWith("%") ? num(parts[3]) / 100 : num(parts[3])) : 1;
  if (fn[1].startsWith("rgb")) return { r: num(parts[0]), g: num(parts[1]), b: num(parts[2]), a };
  const [r, g, b] = hslToRgb(num(parts[0]), num(parts[1]) / 100, num(parts[2]) / 100);
  return { r, g, b, a };
}

function toHsl({ r, g, b }: Rgba): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
}

function hsla(h: number, s: number, l: number, a: number) {
  const pct = (v: number) => `${Math.round(Math.max(0, Math.min(1, v)) * 1000) / 10}%`;
  return `hsla(${Math.round(h)},${pct(s)},${pct(l)},${Math.round(a * 100) / 100})`;
}

/** 원래 투명도는 살리고 색만 바꾼다 */
function withAlpha(target: string, a: number) {
  if (a === 1) return target;
  const c = parseColor(target)!;
  const [h, s, l] = toHsl(c);
  return hsla(h, s, l, c.a * a);
}

/** 정해 둔 색이 없는 면·선: 밝기를 뒤집어 어둡게 (흰 면 → 배경보다 살짝 밝은 남색) */
function darkSurface(c: Rgba) {
  const [h, s, l] = toHsl(c);
  return hsla(h, s * 0.45, 0.1 + (1 - l) * 0.16, c.a);
}

/** 글씨: 진한 글씨일수록 밝게. 색이 있던 글씨(역 이름 파랑 등)는 색을 조금 남긴다 */
function nightText(c: Rgba) {
  const [h, s, l] = toHsl(c);
  return hsla(h, s * 0.6, 0.93 - l * 0.3, c.a);
}

function includesAny(text: string, words: string[]) {
  return words.some((w) => text.includes(w));
}

/** 이 레이어의 면·선 색을 무엇으로 칠할지. null 이면 darkSurface 로 */
function fixedColor(layer: Layer, prop: string): string | null {
  const id = layer.id;
  const src = String(layer["source-layer"] ?? "");
  if (layer.type === "background") return NIGHT_BG;
  if (prop.endsWith("outline-color")) {
    if (src === "park") return "#1d3b33";
    if (src === "building") return "#24324a";
  }
  if (src === "water") return "#122640";
  if (src === "waterway") return "#1d3a5c";
  if (src === "park" || includesAny(id, ["wood", "grass", "wetland"])) return "#15302b";
  if (id.includes("ice")) return "#1c2a3d";
  if (id.includes("sand")) return "#26281f";
  if (src === "building") return layer.type === "fill-extrusion" ? "#1f2a3d" : "#1b2536";
  if (id === "landuse_residential") return "#141d2e";
  if (src === "landuse") return "#18233a";
  if (src === "aeroway") return layer.type === "line" ? "#26334a" : "#1a2538";
  if (src === "boundary") return "#56647e";
  if (src === "transportation" || src === "transportation_name") {
    // 테두리(casing)는 배경보다 어둡게, 길은 배경보다 밝게. 큰길일수록 밝고, 고속도로는 따뜻한 색을 조금
    if (id.includes("casing")) return "#0a101c";
    if (id.includes("rail")) return "#3b4660";
    if (id.includes("motorway")) return "#6a5638";
    if (includesAny(id, ["trunk", "primary", "secondary", "tertiary", "link"])) return "#3a4862";
    return "#27354d";
  }
  return null;
}

function textColor(layer: Layer): string | null {
  const src = String(layer["source-layer"] ?? "");
  if (src === "water_name" || src === "waterway") return "#7d9cc4";
  if (src === "transportation_name") return "#9aa3b2";
  return null;
}

/** 값(문자열 또는 interpolate·match 같은 식) 안의 색 글자만 바꾼다 */
function mapColors(value: unknown, fn: (c: Rgba) => string): unknown {
  if (typeof value === "string") {
    const c = parseColor(value);
    return c ? fn(c) : value;
  }
  if (Array.isArray(value)) return value.map((v) => mapColors(v, fn));
  if (value && typeof value === "object") {
    // 예전 형식 { stops: [[z, 색], …] }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapColors(v, fn)]));
  }
  return value;
}

function darkenLayer(layer: Layer): Layer {
  if (layer.type === "raster") {
    return { ...layer, paint: { ...layer.paint, "raster-brightness-max": 0.32, "raster-saturation": -0.5 } };
  }
  const paint = layer.paint;
  if (!paint) return layer;
  const next: Record<string, unknown> = { ...paint };
  for (const [prop, value] of Object.entries(paint)) {
    if (!prop.endsWith("color")) continue;
    if (prop === "text-color") {
      const fixed = textColor(layer);
      next[prop] = mapColors(value, (c) => (fixed ? withAlpha(fixed, c.a) : nightText(c)));
    } else if (prop === "text-halo-color") {
      next[prop] = HALO;
    } else if (prop.startsWith("icon")) {
      continue;
    } else {
      const fixed = fixedColor(layer, prop);
      next[prop] = mapColors(value, (c) => (fixed ? withAlpha(fixed, c.a) : darkSurface(c)));
    }
  }
  // 테두리 없이 그리던 글씨도 밤 지도에선 배경에 묻히지 않게 얇은 테두리를 준다
  if (layer.type === "symbol" && "text-color" in paint && !("text-halo-color" in paint)) {
    next["text-halo-color"] = HALO;
    next["text-halo-width"] = 1;
  }
  return { ...layer, paint: next };
}

/** 스타일 JSON 을 밤 지도 색으로 바꾼 사본 */
export function darkenStyle(style: Record<string, unknown>): Record<string, unknown> {
  const layers = (style.layers as Layer[]).map(darkenLayer);
  return { ...style, layers };
}
