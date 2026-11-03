// 구역 묶기 자체 점검: node src/features/route/areas.check.ts
import assert from "node:assert/strict";
import type { MapPoint } from "@/lib/types";
import { groupAreas } from "./areas.ts";

const P = (id: string, lat: number, lng: number, stay_min: number | null = null) => ({ id, lat, lng, stay_min, name: id }) as MapPoint;
const ids = (r: ReturnType<typeof groupAreas>) => ({
  groups: r.groups.map((g) => g.points.map((p) => p.id)),
  loose: r.loose.map((l) => l.point.id),
});

// (a) 500m 안쪽 셋 + 5km 떨어진 곳의 500m 안쪽 둘 → 구역 둘 (3곳, 2곳)
const a = [P("a1", 37.57, 126.98), P("a2", 37.572, 126.982), P("a3", 37.569, 126.984)];
const b = [P("b1", 37.57, 127.04), P("b2", 37.571, 127.043)];
const r1 = groupAreas([...a, ...b]);
assert.deepEqual(r1.groups.map((g) => g.points.length), [3, 2]);
assert.equal(r1.loose.length, 0);
assert.ok(r1.groups[0].avgWalkMin > 0);
assert.ok(r1.groups[0].dayMin >= 180); // 머무는 시간 기본 60분 × 3 + 걷기
assert.equal(r1.groups[0].tooLong, false);

// (b) 구역 a 에서 2km 떨어진 곳 → 애매한 곳 (가장 가까운 구역 = a)
const r2 = groupAreas([...a, ...b, P("x", 37.588, 126.98)]);
assert.deepEqual(r2.loose.map((l) => l.point.id), ["x"]);
assert.equal(r2.loose[0].nearestGroup, 0);
assert.ok((r2.loose[0].walkMin ?? 0) > 0);

// (c) 10km 떨어진 두 곳 → 구역 없음, 둘 다 다른 곳과 멂
const r3 = groupAreas([P("p", 37.5, 127.0), P("q", 37.59, 127.0)]);
assert.equal(r3.groups.length, 0);
assert.deepEqual(r3.loose.map((l) => l.nearestGroup), [null, null]);

// (c2) 1.6km 떨어진 두 곳은 구역은 아니지만, 서로가 가장 가까운 곳으로 이유에 나온다
const r5 = groupAreas([P("s1", 37.5446, 127.0557), P("s2", 37.5444, 127.0374)]);
assert.equal(r5.groups.length, 0);
assert.deepEqual(r5.loose.map((l) => l.nearestPlace?.id), ["s2", "s1"]);
assert.ok((r5.loose[0].walkMin ?? 0) > 0);
// 10km 떨어지면 가장 가까운 곳도 없다
assert.deepEqual(r3.loose.map((l) => l.nearestPlace), [null, null]);

// (d) 1km 안쪽 8곳, 각 2시간 → 구역마다 9시간 이하이거나 "하루보다 김", 장소는 하나도 빠지지 않는다
const dense = Array.from({ length: 8 }, (_, i) => P(`d${i}`, 37.57 + (i % 4) * 0.002, 126.98 + Math.floor(i / 4) * 0.003, 120));
const r4 = groupAreas(dense);
for (const g of r4.groups) assert.ok(g.dayMin <= 540 || g.tooLong);
assert.ok(r4.groups.length >= 2);
const total = r4.groups.reduce((s, g) => s + g.points.length, 0) + r4.loose.length;
assert.equal(total, 8);

// (d2) 0.6km 간격으로 줄지어 선 9곳(도보 10분씩): 하루보다 길면 둘 이상으로 나누되, 한 곳씩 흩어지면 안 된다
const line = Array.from({ length: 9 }, (_, i) => P(`l${i}`, 37.57, 126.95 + i * 0.0068));
const r6 = groupAreas(line);
assert.ok(r6.groups.length >= 2, `groups ${r6.groups.length}`);
assert.equal(r6.loose.length, 0);
for (const g of r6.groups) assert.ok(g.dayMin <= 540 || g.tooLong);

// (e) 입력 순서를 바꿔도 결과가 같다
const shuffled = [...dense].reverse();
assert.deepEqual(ids(groupAreas(shuffled)), ids(r4));
assert.deepEqual(ids(groupAreas([...b, ...a].reverse())), ids(r1));

console.log("areas ok");
