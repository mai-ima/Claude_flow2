import "server-only";
import { db } from "@/lib/db";
import { toMonthlyAmount, toYearlyAmount } from "@/lib/money";
import type { BillingCycle } from "@/lib/enums";

export function listSubscriptions(ledgerId: string) {
  return db.subscription.findMany({
    where: { ledgerId },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      paymentMethod: { select: { id: true, name: true } },
      // owner は passwordHash まで載るうえ画面で未使用だったため落とす。
      // 価格改定は直近数件しか表示しないので全件送らない。
      priceChanges: { orderBy: { changedAt: "desc" }, take: 12 },
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

/** プラン上限の判定に使う件数。解約済みは含めない（表示と揃える）。 */
export async function countSubscriptions(ledgerId: string) {
  return db.subscription.count({ where: { ledgerId, status: { not: "CANCELED" } } });
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

/**
 * 帳簿全体の価格変更履歴。
 * 一覧ページ用。サブスク名と請求周期も一緒に返す（年額換算に要る）。
 */
export async function allPriceChanges(ledgerId: string, limit = 200) {
  const rows = await db.subscriptionPriceChange.findMany({
    where: { subscription: { ledgerId } },
    include: { subscription: { select: { id: true, name: true, cycle: true, status: true } } },
    orderBy: { changedAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    subscriptionId: r.subscription.id,
    name: r.subscription.name,
    cycle: r.subscription.cycle,
    status: r.subscription.status,
    oldAmount: r.oldAmount,
    newAmount: r.newAmount,
    changedAt: r.changedAt,
  }));
}
