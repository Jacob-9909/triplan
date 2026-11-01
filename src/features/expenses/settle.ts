import type { Expense } from "@/lib/types";

export interface Transfer {
  from: string;
  to: string;
  krw: number;
}

/**
 * 동행자 정산. 지출마다 낸 사람이 받을 돈(+), 나눌 사람이 낼 돈(−)을 쌓고,
 * 가장 많이 낼 사람 → 가장 많이 받을 사람 순으로 짝지어 송금 횟수를 줄인다.
 * 낸 사람이 없거나 동행자 목록에 없는 지출은 빼고 skipped 로 센다.
 */
export function settle(expenses: Pick<Expense, "amount_krw" | "paid_by" | "split_with">[], travelers: string[]) {
  const balance = new Map(travelers.map((t) => [t, 0]));
  let skipped = 0;
  for (const e of expenses) {
    const among = (e.split_with?.length ? e.split_with : travelers).filter((t) => balance.has(t));
    if (!e.paid_by || !balance.has(e.paid_by) || among.length === 0) {
      skipped++;
      continue;
    }
    balance.set(e.paid_by, balance.get(e.paid_by)! + e.amount_krw);
    for (const t of among) balance.set(t, balance.get(t)! - e.amount_krw / among.length);
  }

  const side = (sign: 1 | -1) =>
    [...balance]
      .filter(([, v]) => v * sign >= 1)
      .map(([name, v]) => ({ name, left: v * sign }))
      .sort((a, b) => b.left - a.left);
  const payers = side(-1);
  const takers = side(1);
  const transfers: Transfer[] = [];
  for (let i = 0, j = 0; i < payers.length && j < takers.length; ) {
    const krw = Math.min(payers[i].left, takers[j].left);
    if (Math.round(krw) > 0) transfers.push({ from: payers[i].name, to: takers[j].name, krw: Math.round(krw) });
    payers[i].left -= krw;
    takers[j].left -= krw;
    if (payers[i].left < 1) i++;
    if (takers[j].left < 1) j++;
  }
  return { balance, transfers, skipped };
}
