"use client";

import { useState } from "react";
import { ScrollTabs } from "@/components/ui/scroll-tabs";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BudgetBars } from "@/components/ui/chart/charts";
import {
  TrendAreaChart,
  CategoryDonut,
  MonthlyBarChart,
  RateLineChart,
} from "@/components/ui/chart/lazy";
import { CategoryIcon, SparklesIcon, TargetIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { colorOf } from "@/lib/colors";
import { savingsRate } from "@/lib/insight";
import { LEVEL_LABEL, type HealthScore } from "@/lib/health-score";
import { AssetTracker } from "./asset-tracker";
import { cn } from "@/lib/cn";

type Tab =
  | "expense"
  | "income"
  | "balance"
  | "yearExpense"
  | "yearIncome"
  | "savings"
  | "savingsRate"
  | "budget"
  | "health"
  | "assets";

const TABS: { value: Tab; label: string }[] = [
  { value: "expense", label: "支出" },
  { value: "income", label: "収入" },
  { value: "balance", label: "収支" },
  { value: "yearExpense", label: "年間支出" },
  { value: "yearIncome", label: "年間収入" },
  { value: "savings", label: "貯蓄" },
  { value: "savingsRate", label: "貯蓄率" },
  { value: "budget", label: "予算" },
  { value: "health", label: "健康度" },
  { value: "assets", label: "資産" },
];

export interface CategorySlice {
  name: string;
  color: string;
  icon: string;
  amount: number;
}

export interface TrendPoint {
  label: string;
  income: number;
  expense: number;
}

export interface BudgetRowItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  spent: number;
}

export interface GoalItem {
  id: string;
  name: string;
  color: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
}

export interface ReportsData {
  currency: string;
  year: number;
  monthLabel: string;
  byExpense: CategorySlice[];
  byIncome: CategorySlice[];
  trend: TrendPoint[];
  year12: TrendPoint[];
  summary: { income: number; expense: number; balance: number };
  prev: { income: number; expense: number; balance: number };
  forecast: number;
  dailyAvg: number;
  budgets: { total: BudgetRowItem | null; categories: BudgetRowItem[] };
  goals: GoalItem[];
  /** 家計の健康度。ルールベースで出した点数と、その内訳。 */
  health: HealthScore;
  /** 資産の推移（古い順）。手で書き留めた額だけが並ぶ。 */
  assets: { id: string; monthLabel: string; monthValue: string; amount: number; diff: number | null; memo: string | null }[];
  /** 資産を記録するときの初期値（今月の1日）。 */
  assetMonthValue: string;
  canEdit: boolean;
}

/** カテゴリ内訳（ドーナツ + 合計行 + 明細リスト）。支出/収入タブで共用。 */
function Breakdown({
  rows,
  currency,
  emptyText,
}: {
  rows: CategorySlice[];
  currency: string;
  emptyText: string;
}) {
  const total = rows.reduce((s, r) => s + r.amount, 0);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-[14px] text-text-tertiary">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      <CategoryDonut
        data={rows}
        center={
          <>
            <div className="text-[11px] text-text-tertiary">合計</div>
            <div className="text-[17px] font-bold tabular-nums">
              {formatMoney(total, currency)}
            </div>
          </>
        }
      />
      <div className="divide-y divide-border-subtle border-t border-border-subtle">
        <div className="flex items-center gap-3 py-3">
          <span className="flex-1 text-[15px] font-semibold">合計</span>
          <span className="text-[15px] font-bold tabular-nums">
            {formatMoney(total, currency)}
          </span>
        </div>
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 py-3">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white"
              style={{ background: colorOf(r.color) }}
            >
              <CategoryIcon name={r.icon} size={16} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px]">{r.name}</span>
            <span className="shrink-0 text-[13px] tabular-nums text-text-tertiary">
              {total > 0 ? Math.round((r.amount / total) * 100) : 0}%
            </span>
            <span className="w-24 shrink-0 text-right text-[14px] font-semibold tabular-nums">
              {formatMoney(r.amount, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 月別の一覧（年間タブ用）。 */
function MonthlyList({
  rows,
  currency,
}: {
  rows: { label: string; amount: number }[];
  currency: string;
}) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="divide-y divide-border-subtle border-t border-border-subtle">
      <div className="flex items-center gap-3 py-3">
        <span className="flex-1 text-[15px] font-semibold">年間合計</span>
        <span className="text-[15px] font-bold tabular-nums">{formatMoney(total, currency)}</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 py-2.5">
          <span className="flex-1 text-[14px] text-text-secondary">{r.label}</span>
          <span className="text-[14px] font-medium tabular-nums">
            {r.amount > 0 ? formatMoney(r.amount, currency) : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ReportsClient({ data }: { data: ReportsData }) {
  const [tab, setTab] = useState<Tab>("expense");
  const {
    currency,
    year,
    monthLabel,
    byExpense,
    byIncome,
    trend,
    year12,
    summary,
    prev,
    forecast,
    dailyAvg,
    budgets,
    goals,
    health,
    assets,
    assetMonthValue,
    canEdit,
  } = data;

  const expenseDelta = summary.expense - prev.expense;
  const expensePct = prev.expense > 0 ? Math.round((expenseDelta / prev.expense) * 100) : null;
  const thisRate = savingsRate(summary.income, summary.expense);

  // 貯蓄率の推移（収入が無い月は線を描かない）
  const rateSeries = year12
    .map((m) => ({ label: m.label, rate: savingsRate(m.income, m.expense) }))
    .filter((r): r is { label: string; rate: number } => r.rate !== null);

  // 貯蓄（累計収支）の推移
  const cumulative = year12.reduce<TrendPoint[]>((acc, m) => {
    const prevTotal = acc.length > 0 ? acc[acc.length - 1].income : 0;
    acc.push({
      label: m.label,
      income: Math.max(0, prevTotal + m.income - m.expense),
      expense: 0,
    });
    return acc;
  }, []);
  const yearBalance = year12.reduce((s, m) => s + m.income - m.expense, 0);

  const yearExpense = year12.map((m) => ({ label: m.label, amount: m.expense }));
  const yearIncome = year12.map((m) => ({ label: m.label, amount: m.income }));
  const budgetRows = [
    ...(budgets.total ? [budgets.total] : []),
    ...budgets.categories,
  ];

  return (
    <div className="space-y-5">
      <ScrollTabs value={tab} onChange={setTab} options={TABS} />

      {tab === "expense" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>カテゴリ別の支出</CardTitle>
                <span className="text-[12px] text-text-tertiary">{monthLabel}</span>
              </div>
            </CardHeader>
            <CardBody>
              <Breakdown
                rows={byExpense}
                currency={currency}
                emptyText="今月の支出はまだありません。記録すると内訳が表示されます。"
              />
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
                    {byExpense[0]?.name ?? "—"}
                  </div>
                  <div className="mt-0.5 text-[12px] tabular-nums text-text-tertiary">
                    {byExpense[0] ? formatMoney(byExpense[0].amount, currency) : "記録なし"}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {tab === "income" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>カテゴリ別の収入</CardTitle>
              <span className="text-[12px] text-text-tertiary">{monthLabel}</span>
            </div>
          </CardHeader>
          <CardBody>
            <Breakdown
              rows={byIncome}
              currency={currency}
              emptyText="今月の収入はまだありません。給与などを記録すると内訳が表示されます。"
            />
          </CardBody>
        </Card>
      )}

      {tab === "balance" && (
        <>
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
            </CardBody>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="p-5">
              <div className="text-[12px] text-text-tertiary">今月の収入</div>
              <div className="mt-1 text-[20px] font-bold tabular-nums text-income">
                {formatMoney(summary.income, currency)}
              </div>
            </Card>
            <Card className="p-5">
              <div className="text-[12px] text-text-tertiary">今月の支出</div>
              <div className="mt-1 text-[20px] font-bold tabular-nums text-expense">
                {formatMoney(summary.expense, currency)}
              </div>
            </Card>
            <Card className="col-span-2 p-5 sm:col-span-1">
              <div className="text-[12px] text-text-tertiary">今月の収支</div>
              <div
                className={cn(
                  "mt-1 text-[20px] font-bold tabular-nums",
                  summary.balance >= 0 ? "text-income" : "text-expense",
                )}
              >
                {formatMoney(summary.balance, currency)}
              </div>
              <div className="mt-0.5 text-[11px] tabular-nums text-text-tertiary">
                前月 {formatMoney(prev.balance, currency)}
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === "yearExpense" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>年間の支出</CardTitle>
              <span className="text-[12px] text-text-tertiary">{year}年</span>
            </div>
          </CardHeader>
          <CardBody>
            <MonthlyBarChart data={yearExpense} tone="expense" />
            <MonthlyList rows={yearExpense} currency={currency} />
          </CardBody>
        </Card>
      )}

      {tab === "yearIncome" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>年間の収入</CardTitle>
              <span className="text-[12px] text-text-tertiary">{year}年</span>
            </div>
          </CardHeader>
          <CardBody>
            <MonthlyBarChart data={yearIncome} tone="income" />
            <MonthlyList rows={yearIncome} currency={currency} />
          </CardBody>
        </Card>
      )}

      {tab === "savings" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>貯まったお金の推移</CardTitle>
                <span className="text-[12px] text-text-tertiary">{year}年の累計</span>
              </div>
            </CardHeader>
            <CardBody>
              <TrendAreaChart data={cumulative} />
              <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
                <span className="text-[13px] text-text-secondary">今年の累計収支</span>
                <span
                  className={cn(
                    "text-[17px] font-bold tabular-nums",
                    yearBalance >= 0 ? "text-income" : "text-expense",
                  )}
                >
                  {formatMoney(yearBalance, currency)}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-1.5">
                  <TargetIcon size={16} className="text-accent" />
                  貯金目標の進捗
                </span>
              </CardTitle>
            </CardHeader>
            <CardBody>
              {goals.length === 0 ? (
                <p className="py-6 text-center text-[14px] text-text-tertiary">
                  まだ目標がありません。目標を作ると、ここに進捗が表示されます。
                </p>
              ) : (
                <div className="space-y-4">
                  {goals.map((g) => {
                    const pct =
                      g.targetAmount > 0
                        ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
                        : 0;
                    return (
                      <div key={g.id}>
                        <div className="mb-1.5 flex items-center gap-2">
                          <span
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white"
                            style={{ background: colorOf(g.color) }}
                          >
                            <CategoryIcon name={g.icon} size={14} />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                            {g.name}
                          </span>
                          <span className="shrink-0 text-[13px] tabular-nums text-text-tertiary">
                            {pct}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full transition-[width] duration-[var(--dur-2)] ease-spring"
                            style={{ width: `${pct}%`, background: colorOf(g.color) }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[12px] tabular-nums text-text-tertiary">
                          <span>{formatMoney(g.currentAmount, currency)}</span>
                          <span>{formatMoney(g.targetAmount, currency)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {tab === "savingsRate" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>貯蓄率の推移</CardTitle>
                <span className="text-[12px] text-text-tertiary">{year}年</span>
              </div>
            </CardHeader>
            <CardBody>
              {rateSeries.length === 0 ? (
                <p className="py-8 text-center text-[14px] text-text-tertiary">
                  収入の記録がまだありません。給与などを記録すると貯蓄率が表示されます。
                </p>
              ) : (
                <RateLineChart data={rateSeries} />
              )}
            </CardBody>
          </Card>

          <Card className="p-5">
            <div className="text-[12px] text-text-tertiary">今月の貯蓄率</div>
            <div
              className={cn(
                "mt-1 text-[28px] font-bold tabular-nums",
                thisRate === null
                  ? "text-text-tertiary"
                  : thisRate >= 0
                    ? "text-income"
                    : "text-expense",
              )}
            >
              {thisRate === null ? "—" : `${thisRate}%`}
            </div>
            <div className="mt-1 text-[12px] text-text-tertiary">
              {thisRate === null
                ? "今月の収入がまだ記録されていません"
                : `収入 ${formatMoney(summary.income, currency)} のうち ${formatMoney(summary.balance, currency)} を残せています`}
            </div>
          </Card>
        </>
      )}

      {tab === "budget" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>予算と実績</CardTitle>
              <span className="text-[12px] text-text-tertiary">{monthLabel}</span>
            </div>
          </CardHeader>
          <CardBody>
            {budgetRows.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-text-tertiary">
                まだ予算が設定されていません。予算を決めると、使いすぎを早めに気づけます。
              </p>
            ) : (
              <BudgetBars rows={budgetRows} currency={currency} />
            )}
          </CardBody>
        </Card>
      )}

      {tab === "health" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>家計の健康度</CardTitle>
              <span className="text-[12px] text-text-tertiary">{monthLabel}</span>
            </div>
          </CardHeader>
          <CardBody>
            {health.measured === 0 ? (
              <p className="py-8 text-center text-[14px] text-text-tertiary">
                この月の記録がまだありません。記録をつけると判定できます。
              </p>
            ) : (
              <>
                <div className="mb-4 text-center">
                  <div
                    className={cn(
                      "text-[40px] font-bold leading-none tabular-nums",
                      health.level === "good" && "text-income",
                      health.level === "poor" && "text-expense",
                    )}
                  >
                    {health.score}
                    <span className="text-[16px] font-medium text-text-tertiary">点</span>
                  </div>
                  <div className="mt-1 text-[13px] text-text-secondary">
                    {LEVEL_LABEL[health.level]}
                    {health.measured < 4 && `（4項目のうち ${health.measured}項目 で判定）`}
                  </div>
                </div>

                <p className="mb-3 text-[12px] leading-relaxed text-text-tertiary">
                  下の4つを見て点数にしています。データが足りない項目は分母から外すので、
                  記録が少ないだけで低くなることはありません。
                </p>

                <div className="space-y-2.5">
                  {health.factors.map((f) => (
                    <div key={f.key} className="rounded-xl bg-surface-2 px-3.5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-medium">{f.label}</span>
                        <span className="shrink-0 text-[13px] tabular-nums text-text-secondary">
                          {f.score === null ? "—" : `${f.score} / ${f.max}`}
                        </span>
                      </div>
                      {f.score !== null && (
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              f.level === "good" && "bg-income",
                              f.level === "fair" && "bg-warning",
                              f.level === "poor" && "bg-expense",
                            )}
                            style={{ width: `${(f.score / f.max) * 100}%` }}
                          />
                        </div>
                      )}
                      <p className="mt-1.5 text-[12px] leading-relaxed text-text-secondary">
                        {f.evidence}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-text-tertiary">
                        {f.advice}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "assets" && (
        <AssetTracker
          rows={assets}
          currency={currency}
          canEdit={canEdit}
          defaultMonth={assetMonthValue}
        />
      )}
    </div>
  );
}
