import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import {
  monthlyTrend,
  yearlyTrend,
  expenseByCategory,
  incomeByCategory,
  monthSummary,
  assetHistory,
  recordingActivity,
} from "@/modules/transactions/queries";
import { subscriptionTotals } from "@/modules/subscriptions/queries";
import { listBudgetsWithSpending } from "@/modules/budgets/queries";
import { listGoals } from "@/modules/goals/queries";
import { ReportsClient } from "@/modules/transactions";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartIcon } from "@/components/icons";
import { AdSlot } from "@/components/ads/ad-slot";
import { clientEnv } from "@/lib/env";
import { monthEndForecast } from "@/lib/insight";
import { healthScore } from "@/lib/health-score";
import { formatMonth } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";
import { getDate } from "date-fns";
import { ExportButton } from "@/modules/transactions";

export const metadata: Metadata = pageMetadata({ title: "分析", noindex: true });

export default async function ReportsPage() {
  const { ledgerId, tier, currency, canEdit } = await getAppContext();
  const now = new Date();
  const year = now.getFullYear();
  const lastMonth = new Date(year, now.getMonth() - 1, 1);

  const [
    trend,
    year12,
    byExpense,
    byIncome,
    summary,
    prev,
    budgets,
    goals,
    assets,
    activity,
    subTotals,
  ] = await Promise.all([
    monthlyTrend(ledgerId, 6),
    yearlyTrend(ledgerId, year),
    expenseByCategory(ledgerId, now),
    incomeByCategory(ledgerId, now),
    monthSummary(ledgerId, now),
    monthSummary(ledgerId, lastMonth),
    listBudgetsWithSpending(ledgerId, now),
    listGoals(ledgerId),
    assetHistory(ledgerId),
    recordingActivity(ledgerId, now),
    subscriptionTotals(ledgerId),
  ]);

  const health = healthScore({
    income: summary.income,
    expense: summary.expense,
    budget: budgets.total?.amount ?? null,
    subscriptionMonthly: subTotals.monthly,
    transactionCount: activity.count,
    recordedDays: activity.recordedDays,
    daysInMonth: activity.elapsedDays,
  });

  // 資産だけ書き留めている人もいる。取引が無いだけで空状態にすると、
  // 入れたはずの資産にたどり着けなくなる。
  const hasData =
    trend.some((t) => t.income > 0 || t.expense > 0) ||
    year12.some((t) => t.income > 0 || t.expense > 0) ||
    assets.length > 0;

  return (
    <PageContainer>
      <PageHeader
        title="分析"
        subtitle="お金の流れを、いろいろな角度から。"
        action={tier === "PRO" ? <Badge tone="pod" size="md">PRO</Badge> : undefined}
      />

      {!hasData ? (
        <EmptyState
          icon={<ChartIcon size={28} />}
          title="まだ分析できるデータがありません"
          description="家計簿に収支を記録すると、ここに推移や内訳が表示されます。"
        />
      ) : (
        <>
          <ReportsClient
            data={{
              currency,
              year,
              monthLabel: formatMonth(now),
              byExpense,
              byIncome,
              trend,
              year12,
              summary,
              prev,
              forecast: monthEndForecast(summary.expense, now),
              dailyAvg: Math.round(summary.expense / getDate(now)),
              budgets,
              goals: goals.map((g) => ({
                id: g.id,
                name: g.name,
                color: g.color,
                icon: g.icon,
                targetAmount: g.targetAmount,
                currentAmount: g.currentAmount,
              })),
              health,
              assets: assets.map((a) => ({
                id: a.id,
                monthLabel: formatMonth(a.month),
                monthValue: `${a.month.getFullYear()}-${String(a.month.getMonth() + 1).padStart(2, "0")}`,
                amount: a.amount,
                diff: a.diff,
                memo: a.memo,
              })),
              assetMonthValue: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
              canEdit,
            }}
          />

          <Card className="mt-5 flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">月次レポート</div>
              <p className="text-[13px] text-text-secondary">
                1か月のまとめを1枚に。印刷や PDF での保存ができます。
              </p>
            </div>
            <ButtonLink href="/reports/monthly" size="sm" variant="tinted">
              開く
            </ButtonLink>
          </Card>

          <Card className="mt-3 p-5">
            <div className="flex items-center justify-between">
              <div className="text-[12px] text-text-tertiary">CSV エクスポート</div>
              {tier !== "PRO" && <Badge tone="pod" size="sm">PRO</Badge>}
            </div>
            <ExportButton enabled={tier === "PRO"} />
          </Card>
        </>
      )}

      <AdSlot
        tier={tier}
        adsenseClient={clientEnv.NEXT_PUBLIC_ADSENSE_CLIENT}
        className="mt-6"
      />
    </PageContainer>
  );
}
