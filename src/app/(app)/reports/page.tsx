import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import {
  monthlyTrend,
  expenseByCategory,
  monthSummary,
} from "@/modules/transactions/queries";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendAreaChart, CategoryDonut } from "@/components/ui/chart/charts";
import { colorOf } from "@/lib/colors";
import { CategoryIcon, ChartIcon, SparklesIcon } from "@/components/icons";
import { AdSlot } from "@/components/ads/ad-slot";
import { clientEnv } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { monthEndForecast } from "@/lib/insight";
import { pageMetadata } from "@/lib/seo";
import { getDate } from "date-fns";

export const metadata: Metadata = pageMetadata({ title: "分析", noindex: true });

export default async function ReportsPage() {
  const { ledgerId, tier, currency } = await getAppContext();
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [trend, byCat, summary, prev] = await Promise.all([
    monthlyTrend(ledgerId, 6),
    expenseByCategory(ledgerId, now),
    monthSummary(ledgerId, now),
    monthSummary(ledgerId, lastMonth),
  ]);

  const totalExpense = byCat.reduce((s, c) => s + c.amount, 0);
  const hasData = trend.some((t) => t.income > 0 || t.expense > 0);

  // 前月比（支出）
  const expenseDelta = summary.expense - prev.expense;
  const expensePct =
    prev.expense > 0 ? Math.round((expenseDelta / prev.expense) * 100) : null;

  // 今月のインサイト（追加クエリなしで既存値から算出）
  const forecast = monthEndForecast(summary.expense, now);
  const dailyAvg = Math.round(summary.expense / getDate(now));

  return (
    <PageContainer>
      <PageHeader
        title="分析"
        subtitle="お金の流れを、美しいグラフで。"
        action={tier === "PRO" ? <Badge tone="pod" size="md">PRO</Badge> : undefined}
      />

      {!hasData ? (
        <EmptyState
          icon={<ChartIcon size={28} />}
          title="まだ分析できるデータがありません"
          description="家計簿に収支を記録すると、ここに推移や内訳が表示されます。"
        />
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>収支の推移（6ヶ月）</CardTitle>
                {expensePct !== null && (
                  <Badge tone={expenseDelta > 0 ? "expense" : "income"} size="sm">
                    支出 前月比 {expenseDelta > 0 ? "+" : ""}
                    {expensePct}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <TrendAreaChart data={trend} />
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border-subtle pt-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span className="h-2 w-2 rounded-full bg-income" />今月の収入
                  </span>
                  <span className="font-semibold tabular-nums text-income">
                    {formatMoney(summary.income, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span className="h-2 w-2 rounded-full bg-expense" />今月の支出
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(summary.expense, currency)}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-1.5">
                  <SparklesIcon size={16} className="text-accent" />
                  今月のインサイト
                </span>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-surface-2 px-4 py-3">
                  <div className="text-[12px] text-text-tertiary">今月の着地予測</div>
                  <div className="mt-0.5 text-[18px] font-bold tabular-nums">
                    {formatMoney(forecast, currency)}
                  </div>
                  <div className="mt-0.5 text-[12px] text-text-tertiary">今のペースが続いた場合</div>
                </div>
                <div className="rounded-xl bg-surface-2 px-4 py-3">
                  <div className="text-[12px] text-text-tertiary">1日あたりの支出</div>
                  <div className="mt-0.5 text-[18px] font-bold tabular-nums">
                    {formatMoney(dailyAvg, currency)}
                  </div>
                  <div className="mt-0.5 text-[12px] text-text-tertiary">今月の平均</div>
                </div>
                <div className="rounded-xl bg-surface-2 px-4 py-3">
                  <div className="text-[12px] text-text-tertiary">最多カテゴリ</div>
                  <div className="mt-0.5 truncate text-[18px] font-bold">
                    {byCat[0]?.name ?? "—"}
                  </div>
                  <div className="mt-0.5 text-[12px] text-text-tertiary tabular-nums">
                    {byCat[0] ? formatMoney(byCat[0].amount, currency) : "記録なし"}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別の支出（今月）</CardTitle>
            </CardHeader>
            <CardBody>
              {byCat.length === 0 ? (
                <p className="py-6 text-center text-[14px] text-text-tertiary">
                  今月の支出はまだありません。
                </p>
              ) : (
                <div className="grid items-center gap-6 sm:grid-cols-2">
                  <CategoryDonut
                    data={byCat}
                    center={
                      <>
                        <div className="text-[11px] text-text-tertiary">支出合計</div>
                        <div className="text-[17px] font-bold tabular-nums">
                          {formatMoney(totalExpense, currency)}
                        </div>
                      </>
                    }
                  />
                  <div className="space-y-2">
                    {byCat.slice(0, 6).map((c) => (
                      <div key={c.name} className="flex items-center gap-3">
                        <span
                          className="grid h-8 w-8 place-items-center rounded-lg text-white"
                          style={{ background: colorOf(c.color) }}
                        >
                          <CategoryIcon name={c.icon} size={16} />
                        </span>
                        <span className="flex-1 text-[14px]">{c.name}</span>
                        <span className="text-[13px] text-text-tertiary tabular-nums">
                          {totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0}%
                        </span>
                        <span className="w-20 text-right text-[14px] font-semibold tabular-nums">
                          {formatMoney(c.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="p-5">
              <div className="text-[12px] text-text-tertiary">今月の収支</div>
              <div
                className={`mt-1 text-[22px] font-bold tabular-nums ${
                  summary.balance >= 0 ? "text-income" : "text-expense"
                }`}
              >
                {formatMoney(summary.balance, currency)}
              </div>
            </Card>
            <Card className="p-5">
              <div className="text-[12px] text-text-tertiary">支出の前月比</div>
              {expensePct === null ? (
                <>
                  <div className="mt-1 text-[22px] font-bold tabular-nums text-text-tertiary">—</div>
                  <div className="mt-0.5 text-[11px] text-text-tertiary">前月のデータなし</div>
                </>
              ) : (
                <div
                  className={`mt-1 text-[22px] font-bold tabular-nums ${
                    expenseDelta > 0 ? "text-expense" : "text-income"
                  }`}
                >
                  {expenseDelta > 0 ? "+" : ""}
                  {expensePct}%
                </div>
              )}
              <div className="mt-0.5 text-[11px] text-text-tertiary tabular-nums">
                前月 {formatMoney(prev.expense, currency)}
              </div>
            </Card>
            <Card className="col-span-2 p-5 sm:col-span-1">
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-text-tertiary">CSV エクスポート</div>
                {tier !== "PRO" && <Badge tone="pod" size="sm">PRO</Badge>}
              </div>
              <a
                href={tier === "PRO" ? "/api/export/transactions" : "/billing"}
                className="mt-2 inline-block text-[14px] font-medium text-accent"
              >
                {tier === "PRO" ? "ダウンロード" : "PROで利用可能"}
              </a>
            </Card>
          </div>
        </div>
      )}

      <AdSlot
        tier={tier}
        adsenseClient={clientEnv.NEXT_PUBLIC_ADSENSE_CLIENT}
        className="mt-6"
      />
    </PageContainer>
  );
}
