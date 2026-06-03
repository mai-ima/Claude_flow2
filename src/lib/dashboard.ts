import "server-only";
import { monthSummary, recentTransactions, expenseByCategory } from "@/modules/transactions/queries";
import { listSubscriptions, subscriptionTotals } from "@/modules/subscriptions/queries";
import { listBudgetsWithSpending } from "@/modules/budgets/queries";
import { detectWaste } from "@/modules/subscriptions/waste-detect";
import { daysUntil } from "./date";
import { canUse } from "./plans";
import type { PlanTier } from "./enums";

/**
 * ダッシュボードに必要なデータを 1 箇所で集約（cross-module は lib に集約する方針）。
 * ページは表示に専念できる。
 */
export async function getDashboardData(
  ledgerId: string,
  tier: PlanTier,
  now: Date = new Date(),
) {
  const showBudget = canUse(tier, "budgets");
  const [summary, subTotals, subs, recent, budgetData, byCategory] = await Promise.all([
    monthSummary(ledgerId, now),
    subscriptionTotals(ledgerId),
    listSubscriptions(ledgerId),
    recentTransactions(ledgerId, 5),
    showBudget ? listBudgetsWithSpending(ledgerId, now) : Promise.resolve(null),
    expenseByCategory(ledgerId, now),
  ]);

  const upcoming = subs
    .filter((s) => s.status === "ACTIVE")
    .map((s) => ({ ...s, d: daysUntil(s.nextRenewalAt) }))
    .filter((s) => s.d >= 0 && s.d <= 31)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);

  const wasteful = subs.filter((s) => detectWaste(s.lastUsedAt, s.status) === "waste");

  return {
    summary,
    subTotals,
    totalBudget: budgetData?.total ?? null,
    byCategory: byCategory.slice(0, 6),
    upcoming,
    wasteful,
    recent,
    showBudget,
  };
}
