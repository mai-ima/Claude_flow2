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
import { CategoryIcon, ChartIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "分析", noindex: true });

export default async function ReportsPage() {
  const { ledgerId, tier } = await getAppContext();
  const now = new Date();

  const [trend, byCat, summary] = await Promise.all([
    monthlyTrend(ledgerId, 6),
    expenseByCategory(ledgerId, now),
    monthSummary(ledgerId, now),
  ]);

  const totalExpense = byCat.reduce((s, c) => s + c.amount, 0);
  const hasData = trend.some((t) => t.income > 0 || t.expense > 0);

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
              <CardTitle>収支の推移（6ヶ月）</CardTitle>
            </CardHeader>
            <CardBody>
              <TrendAreaChart data={trend} />
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
                  <CategoryDonut data={byCat} />
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
                          {formatMoney(c.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-5">
              <div className="text-[12px] text-text-tertiary">今月の収支</div>
              <div
                className={`mt-1 text-[22px] font-bold tabular-nums ${
                  summary.balance >= 0 ? "text-income" : "text-expense"
                }`}
              >
                {formatMoney(summary.balance)}
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-text-tertiary">CSV エクスポート</div>
                {tier !== "PRO" && <Badge tone="pod" size="sm">PRO</Badge>}
              </div>
              <a
                href={tier === "PRO" ? "/api/export/transactions" : "/pricing"}
                className="mt-2 inline-block text-[14px] font-medium text-accent"
              >
                {tier === "PRO" ? "ダウンロード" : "PROで利用可能"}
              </a>
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
