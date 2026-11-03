/** Day 에 넣은 구역 이름 합치기: 이미 이름이 있으면 " · " 로 잇는다. 새 이름이 없으면(대체 이름) 그대로 둔다 */
export function mergeArea(existing: string | null | undefined, incoming: string | null): string | null {
  if (!incoming) return existing || null;
  if (!existing) return incoming;
  return existing.split(" · ").includes(incoming) ? existing : `${existing} · ${incoming}`;
}
