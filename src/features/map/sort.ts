/** day_number → visit_order 순 정렬 */
export function sortPointsByOrder<T extends { day_number: number | null; visit_order: number | null }>(
  points: T[]
): T[] {
  return [...points].sort(
    (a, b) =>
      (a.day_number ?? Number.MAX_SAFE_INTEGER) - (b.day_number ?? Number.MAX_SAFE_INTEGER) ||
      (a.visit_order ?? Number.MAX_SAFE_INTEGER) - (b.visit_order ?? Number.MAX_SAFE_INTEGER)
  );
}
