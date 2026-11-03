/** Day 에 넣은 구역 이름 합치기: 이미 이름이 있으면 " · " 로 잇는다. 새 이름이 없으면(대체 이름) 그대로 둔다 */
export function mergeArea(existing: string | null | undefined, incoming: string | null): string | null {
  if (!incoming) return existing || null;
  if (!existing) return incoming;
  return existing.split(" · ").includes(incoming) ? existing : `${existing} · ${incoming}`;
}

/** 구역 하나를 가리키는 키: 장소 id 를 정렬해 잇는다 (다른 구역이 바뀌어도 그대로) */
export const groupKey = (ids: string[]) => [...ids].sort().join(",");

/** 구역 키별 이름. 아직 짓는 중이면 undefined, 못 지었으면 null */
export function namesFor(keys: string[], cache: Record<string, string | null>): (string | null | undefined)[] {
  return keys.map((k) => (k in cache ? cache[k] : undefined));
}

/** 아직 이름이 없고 묻는 중도 아닌 구역 */
export function missingKeys(keys: string[], cache: Record<string, string | null>, inflight: Set<string>): string[] {
  return keys.filter((k) => !(k in cache) && !inflight.has(k));
}
