import type {
  Expense,
  ExpenseParticipant,
  Member,
  MemberBalance,
  Transfer,
} from "./types";

/**
 * تقسیم مساوی مبلغ بین چند نفر.
 * اگه مبلغ بر تعداد نفرات بخش‌پذیر نباشه، باقی‌مانده‌ی تومانی یکی‌یکی به
 * نفرات اول داده می‌شه تا جمع سهم‌ها دقیقاً برابر مبلغ هزینه بمونه.
 */
export function splitEqually(
  amount: number,
  participantIds: string[]
): ExpenseParticipant[] {
  const n = participantIds.length;
  if (n === 0) return [];
  const base = Math.floor(amount / n);
  let remainder = amount - base * n;
  return participantIds.map((memberId) => {
    let shareAmount = base;
    if (remainder > 0) {
      shareAmount += 1;
      remainder -= 1;
    }
    return { memberId, shareAmount };
  });
}

/**
 * وضعیت هر عضو:
 * paid    = چقدر از جیبش پرداخت کرده
 * owed    = چقدر سهمش از هزینه‌ها بوده
 * balance = paid - owed (مثبت: بستانکار، منفی: بدهکار)
 */
export function computeBalances(
  members: Member[],
  expenses: Expense[]
): MemberBalance[] {
  const map = new Map<string, MemberBalance>();
  for (const m of members) {
    map.set(m.id, {
      memberId: m.id,
      name: m.name,
      paid: 0,
      owed: 0,
      balance: 0,
    });
  }
  for (const e of expenses) {
    const payer = map.get(e.payerId);
    if (payer) payer.paid += e.amount;
    for (const p of e.participants) {
      const b = map.get(p.memberId);
      if (b) b.owed += p.shareAmount;
    }
  }
  const balances = [...map.values()];
  for (const b of balances) b.balance = b.paid - b.owed;
  return balances;
}

/**
 * الگوریتم حریصانه برای کمترین تعداد واریز:
 * همیشه بزرگ‌ترین بدهکار رو به بزرگ‌ترین بستانکار وصل می‌کنیم تا با
 * کمترین تراکنش، حساب همه تسویه بشه (حداکثر n-1 واریز).
 */
export function computeTransfers(balances: MemberBalance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ ...b }))
    .sort(
      (a, b) => b.balance - a.balance || a.memberId.localeCompare(b.memberId)
    );
  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ ...b }))
    .sort(
      (a, b) => a.balance - b.balance || a.memberId.localeCompare(b.memberId)
    );

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.balance, -debtor.balance);
    if (amount > 0) {
      transfers.push({
        fromId: debtor.memberId,
        fromName: debtor.name,
        toId: creditor.memberId,
        toName: creditor.name,
        amount,
      });
    }
    creditor.balance -= amount;
    debtor.balance += amount;
    if (creditor.balance === 0) ci += 1;
    if (debtor.balance === 0) di += 1;
  }
  return transfers;
}
