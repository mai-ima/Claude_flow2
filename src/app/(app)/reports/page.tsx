import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import {
  monthlyTrend,
  yearlyTrend,
  expenseByCategory,
  incomeByCategory,
  monthSummary,
} from "@/modules/transactions/queries";
import { listBudgetsWithSpending } from "@/modules/budgets/queries";
import { listGoals } from "@/modules/goals/queries";
import { ReportsClient } from "@/modules/transactions";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartIcon } from "@/components/icons";
import { AdSlot } from "@/components/ads/ad-slot";
import { clientEnv } from "@/lib/env";
import { monthEndForecast } from "@/lib/insight";
import { formatMonth } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";
import { getDate } from "date-fns";
import { ExportButton } from "@/modules/transactions";

export const metadata: Metadata = pageMetadata({ title: "分析", noindex: true });

export default async function ReportsPage() {
  const { ledgerId, tier, currency } = await getAppContext();
  const now = new Date();
  const year = now.getFullYear();
  const lastMonth = new Date(year, now.getMonth() - 1, 1);

  const [trend, year12, byExpense, byIncome, summary, prev, budgets, goals] = await Promise.all([
    monthlyTrend(ledgerId, 6),
    yearlyTrend(ledgerId, year),
    expenseByCategory(ledgerId, now),
    incomeByCategory(ledgerId, now),
    monthSummary(ledgerId, now),
    monthSummary(ledgerId, lastMonth),
    listBudgetsWithSpending(ledgerId, now),
    listGoals(ledgerId),
  ]);

  const hasData =
    trend.some((t) => t.income > 0 || t.expense > 0) ||
    year12.some((t) => t.income > 0 || t.expense > 0);

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
            }}
          />

          <Card className="mt-5 p-5">
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
