// 밤 지도 색 바꾸기 자체 점검: node src/features/map/darkStyle.check.ts
import assert from "node:assert/strict";
import { darkenStyle, NIGHT_BG, parseColor } from "./darkStyle.ts";

const lum = (c: string) => {
  const p = parseColor(c)!;
  return 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b;
};

// 색 읽기
assert.deepEqual(parseColor("#fea"), { r: 255, g: 238, b: 170, a: 1 });
assert.equal(parseColor("rgba(255,255,255,0.7)")!.a, 0.7);
const hsl = parseColor("hsl(0,0%,100%)")!;
assert.equal(Math.round(hsl.r), 255);
assert.equal(parseColor("not-a-color"), null);
assert.equal(parseColor("#12345"), null);

const style = {
  version: 8,
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#f8f4f0" } },
    { id: "water", type: "fill", "source-layer": "water", paint: { "fill-color": "rgb(158,189,255)" } },
    { id: "road_minor", type: "line", "source-layer": "transportation", paint: { "line-color": "#fff" } },
    { id: "road_minor_casing", type: "line", "source-layer": "transportation", paint: { "line-color": "#cfcdca" } },
    { id: "road_trunk_primary", type: "line", "source-layer": "transportation", paint: { "line-color": "#fea" } },
    {
      id: "road_motorway",
      type: "line",
      "source-layer": "transportation",
      paint: { "line-color": ["interpolate", ["linear"], ["zoom"], 5, "hsl(26,87%,62%)", 6, "#fc8"] },
    },
    {
      id: "landuse_residential",
      type: "fill",
      "source-layer": "landuse",
      paint: { "fill-color": ["interpolate", ["linear"], ["zoom"], 9, "hsla(0,3%,85%,0.84)", 12, "hsla(35,57%,88%,0.49)"] },
    },
    { id: "label_city", type: "symbol", "source-layer": "place", paint: { "text-color": "#000", "text-halo-color": "#fff" } },
    { id: "highway-name-minor", type: "symbol", "source-layer": "transportation_name", paint: { "text-color": "#666" } },
    { id: "poi_r1", type: "symbol", "source-layer": "poi", paint: { "text-color": "#666", "icon-color": "#123456" } },
    { id: "natural_earth", type: "raster", paint: {} },
    { id: "road_one_way_arrow", type: "symbol", layout: {} },
  ],
};
const dark = darkenStyle(style).layers as Array<{ id: string; paint?: Record<string, unknown> }>;
const paint = (id: string) => dark.find((l) => l.id === id)!.paint!;

// 배경은 앱 다크 배경과 같다
assert.equal(paint("background")["background-color"], NIGHT_BG);
// 길은 배경보다 밝고, 테두리는 배경보다 어둡고, 큰길은 작은 길보다 밝다
const bg = lum(NIGHT_BG);
const minor = lum(paint("road_minor")["line-color"] as string);
assert.ok(minor > bg, "작은 길이 배경보다 밝아야 한다");
assert.ok(lum(paint("road_minor_casing")["line-color"] as string) < bg, "길 테두리는 배경보다 어둡다");
assert.ok(lum(paint("road_trunk_primary")["line-color"] as string) > minor, "큰길이 작은 길보다 밝다");
// 식(interpolate) 안의 색도 바뀌고 식 모양은 그대로
const motorway = paint("road_motorway")["line-color"] as unknown[];
assert.equal(motorway[0], "interpolate");
assert.ok(lum(motorway[4] as string) < 140 && lum(motorway[6] as string) < 140);
// 원래 투명도는 살린다
const res = paint("landuse_residential")["fill-color"] as unknown[];
assert.equal(parseColor(res[4] as string)!.a, 0.84);
assert.equal(parseColor(res[6] as string)!.a, 0.49);
// 글씨는 밝게, 테두리는 어둡게. 테두리가 없던 글씨에도 테두리를 준다
assert.ok(lum(paint("label_city")["text-color"] as string) > 200);
assert.ok(lum(paint("label_city")["text-halo-color"] as string) < 40);
assert.ok("text-halo-color" in paint("highway-name-minor"));
// 아이콘 색·물 색
assert.equal(paint("poi_r1")["icon-color"], "#123456");
assert.ok(lum(paint("water")["fill-color"] as string) < 60);
// 위성 사진 같은 래스터는 어둡게
assert.equal(paint("natural_earth")["raster-brightness-max"], 0.32);
// paint 가 없는 레이어는 그대로
assert.equal(dark.find((l) => l.id === "road_one_way_arrow")!.paint, undefined);

console.log("darkStyle ok");
