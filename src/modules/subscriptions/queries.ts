import "server-only";
import { db } from "@/lib/db";
import { toMonthlyAmount, toYearlyAmount } from "@/lib/money";
import type { BillingCycle } from "@/lib/enums";

export function listSubscriptions(ledgerId: string) {
  return db.subscription.findMany({
    where: { ledgerId },
    include: {
      category: true,
      paymentMethod: true,
      owner: true,
      priceChanges: { orderBy: { changedAt: "desc" } },
    },
    orderBy: { nextRenewalAt: "asc" },
  });
}

/** サブスクの価格改定履歴（新しい順）。ledgerId で越境を防止。 */
export async function priceHistory(ledgerId: string, subscriptionId: string) {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    select: { ledgerId: true },
  });
  if (!sub || sub.ledgerId !== ledgerId) return [];
  return db.subscriptionPriceChange.findMany({
    where: { subscriptionId },
    orderBy: { changedAt: "desc" },
  });
}

export async function subscriptionTotals(ledgerId: string) {
  const subs = await db.subscription.findMany({
    where: { ledgerId, status: { in: ["ACTIVE", "TRIAL"] } },
    select: { amount: true, cycle: true },
  });
  let monthly = 0;
  let yearly = 0;
  for (const s of subs) {
    monthly += toMonthlyAmount(s.amount, s.cycle as BillingCycle);
    yearly += toYearlyAmount(s.amount, s.cycle as BillingCycle);
  }
  return { monthly, yearly, count: subs.length };
}

export async function countSubscriptions(ledgerId: string) {
  return db.subscription.count({ where: { ledgerId } });
}

/** 決済手段ごとにサブスクをまとめる（サブスク・スタック用）。 */
export async function subscriptionsByPaymentMethod(ledgerId: string) {
  const [methods, subs] = await Promise.all([
    db.paymentMethod.findMany({ where: { ledgerId }, orderBy: { createdAt: "asc" } }),
    db.subscription.findMany({
      where: { ledgerId, status: { in: ["ACTIVE", "TRIAL"] } },
      orderBy: { amount: "desc" },
    }),
  ]);
  const groups = methods.map((m) => {
    const methodSubs = subs.filter((s) => s.paymentMethodId === m.id);
    return {
      method: m,
      subs: methodSubs,
      monthly: methodSubs.reduce(
        (sum, s) => sum + toMonthlyAmount(s.amount, s.cycle as BillingCycle),
        0,
      ),
    };
  });
  const unassigned = subs.filter((s) => !s.paymentMethodId);
  return { groups, unassigned };
}
