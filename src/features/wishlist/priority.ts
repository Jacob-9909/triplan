export const PRIORITIES = [
  { value: 3, label: "꼭 갈 거야" },
  { value: 2, label: "가고 싶어" },
  { value: 1, label: "언젠가" },
] as const;

export function priorityLabel(p: number) {
  return PRIORITIES.find((x) => x.value === p)?.label ?? "가고 싶어";
}
