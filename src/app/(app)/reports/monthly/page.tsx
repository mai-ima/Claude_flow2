import type { Metadata } from "next";
import Link from "next/link";
import { getAppContext, resolveMonth, monthParam } from "@/lib/app-context";
import {
  expenseByCategory,
  incomeByCategory,
  monthSummary,
  recordingActivity,
  assetHistory,
} from "@/modules/transactions/queries";
import { listBudgetsWithSpending } from "@/modules/budgets/queries";
import { subscriptionTotals } from "@/modules/subscriptions/queries";
import { MonthlyReport } from "@/modules/transactions";
import { healthScore } from "@/lib/health-score";
import { formatMonth } from "@/lib/date";
import { savingsRate } from "@/lib/insight";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "月次レポート", noindex: true });

/**
 * 1か月のまとめを1枚にする。
 *
 * PDF を作るライブラリは入れない。ブラウザの印刷から PDF で保存できるし、
 * そのほうが余計な依存を増やさずに済む。画面はそのまま印刷向けに整える。
 */
export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { ledgerId, currency, ledger } = await getAppContext();
  const { m } = await searchParams;
  const month = resolveMonth(m);
  const [summary, prev, byExpense, byIncome, budgets, subTotals, activity, assets] =
    await Promise.all([
      monthSummary(ledgerId, month),
      monthSummary(ledgerId, new Date(month.getFullYear(), month.getMonth() - 1, 1)),
      expenseByCategory(ledgerId, month),
      incomeByCategory(ledgerId, month),
      listBudgetsWithSpending(ledgerId, month),
      subscriptionTotals(ledgerId),
      recordingActivity(ledgerId, month),
      assetHistory(ledgerId, 2),
    ]);

  const health = healthScore({
    income: summary.income,
    expense: summary.expense,
    budget: budgets.total?.amount ?? null,
    subscriptionMonthly: subTotals.monthly,
    transactionCount: activity.count,
    recordedDays: activity.recordedDays,
    // 分母は数える側と同じ「ここまでの日数」。進行中の月で月末までの
    // 日数で割ると、月初はどれだけつけていても足りないように見える。
    daysInMonth: activity.elapsedDays,
  });

  const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const latestAsset = assets.length > 0 ? assets[assets.length - 1] : null;

  return (
    <MonthlyReport
      ledgerName={ledger.name}
      monthLabel={formatMonth(month)}
      prevHref={`/reports/monthly?m=${monthParam(prevMonth)}`}
      nextHref={`/reports/monthly?m=${monthParam(nextMonth)}`}
      currency={currency}
      summary={summary}
      prev={prev}
      savingsRate={savingsRate(summary.income, summary.expense)}
      expenseRows={byExpense.map((r) => ({
        name: r.name,
        color: r.color,
        amount: r.amount,
        children: r.children.map((c) => ({ name: c.name, amount: c.amount })),
      }))}
      incomeRows={byIncome.map((r) => ({
        name: r.name,
        color: r.color,
        amount: r.amount,
        children: [],
      }))}
      budgetRows={budgets.categories.map((b) => ({
        name: b.name,
        amount: b.available,
        spent: b.spent,
      }))}
      totalBudget={
        budgets.total ? { amount: budgets.total.available, spent: budgets.total.spent } : null
      }
      subscriptionMonthly={subTotals.monthly}
      subscriptionCount={subTotals.count}
      recordedDays={activity.recordedDays}
      transactionCount={activity.count}
      health={health}
      asset={
        latestAsset
          ? {
              monthLabel: formatMonth(latestAsset.month),
              amount: latestAsset.amount,
              diff: latestAsset.diff,
            }
          : null
      }
      backLink={<Link href="/reports">分析へ戻る</Link>}
    />
  );
}
