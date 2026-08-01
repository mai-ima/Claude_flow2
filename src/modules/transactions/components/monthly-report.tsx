"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LEVEL_LABEL, type HealthScore } from "@/lib/health-score";
import { formatMoney } from "@/lib/money";
import { colorOf } from "@/lib/colors";
import { cn } from "@/lib/cn";

interface Row {
  name: string;
  color: string;
  amount: number;
  children: { name: string; amount: number }[];
}

/**
 * 1か月のまとめ。印刷してそのまま残せる1枚にする。
 *
 * PDF を作るライブラリは入れていない。ブラウザの印刷から PDF で保存できる。
 * 画面のナビゲーションや操作ボタンは print では消し、中身だけが残るようにする。
 */
export function MonthlyReport({
  ledgerName,
  monthLabel,
  prevHref,
  nextHref,
  currency,
  summary,
  prev,
  savingsRate,
  expenseRows,
  incomeRows,
  budgetRows,
  totalBudget,
  subscriptionMonthly,
  subscriptionCount,
  recordedDays,
  transactionCount,
  health,
  asset,
  backLink,
}: {
  ledgerName: string;
  monthLabel: string;
  prevHref: string;
  nextHref: string;
  currency: string;
  summary: { income: number; expense: number; balance: number };
  prev: { income: number; expense: number; balance: number };
  savingsRate: number | null;
  expenseRows: Row[];
  incomeRows: Row[];
  budgetRows: { name: string; amount: number; spent: number }[];
  totalBudget: { amount: number; spent: number } | null;
  subscriptionMonthly: number;
  subscriptionCount: number;
  recordedDays: number;
  transactionCount: number;
  health: HealthScore;
  asset: { monthLabel: string; amount: number; diff: number | null } | null;
  backLink: React.ReactNode;
}) {
  const expenseTotal = expenseRows.reduce((s, r) => s + r.amount, 0);
  const incomeTotal = incomeRows.reduce((s, r) => s + r.amount, 0);
  const expenseDelta = summary.expense - prev.expense;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-4 print:max-w-none print:px-0 print:pt-0">
      {/* 操作まわりは印刷に含めない */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-1">
          <Link
            href={prevHref}
            className="rounded-full px-3 py-2 text-[13px] font-medium text-accent"
          >
            ← 前の月
          </Link>
          <Link
            href={nextHref}
            className="rounded-full px-3 py-2 text-[13px] font-medium text-accent"
          >
            次の月 →
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-text-secondary">{backLink}</span>
          <Button size="sm" onClick={() => window.print()}>
            印刷 / PDF で保存
          </Button>
        </div>
      </div>

      <header className="mb-6 border-b border-border-subtle pb-4">
        <div className="text-[13px] text-text-tertiary">{ledgerName}</div>
        <h1 className="mt-0.5 text-[26px] font-bold tracking-tight">{monthLabel}のまとめ</h1>
      </header>

      {/* 収支 */}
      <section className="mb-7">
        <h2 className="mb-2.5 text-[15px] font-semibold">収支</h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="収入" value={formatMoney(summary.income, currency)} tone="income" />
          <Stat label="支出" value={formatMoney(summary.expense, currency)} tone="expense" />
          <Stat
            label="残った額"
            value={formatMoney(summary.balance, currency)}
            tone={summary.balance >= 0 ? "income" : "expense"}
          />
        </div>
        <p className="mt-2.5 text-[13px] leading-relaxed text-text-secondary">
          前の月の支出は {formatMoney(prev.expense, currency)} でした。
          {expenseDelta === 0
            ? "同じ額です。"
            : `今月は ${formatMoney(Math.abs(expenseDelta), currency)} ${expenseDelta > 0 ? "多く" : "少なく"}使っています。`}
          {savingsRate !== null && ` 収入のうち ${savingsRate}% が残りました。`}
        </p>
      </section>

      {/* 支出の内訳 */}
      <section className="mb-7">
        <h2 className="mb-2.5 text-[15px] font-semibold">支出の内訳</h2>
        <Breakdown rows={expenseRows} total={expenseTotal} currency={currency} />
      </section>

      {/* 収入の内訳 */}
      {incomeRows.length > 0 && (
        <section className="mb-7">
          <h2 className="mb-2.5 text-[15px] font-semibold">収入の内訳</h2>
          <Breakdown rows={incomeRows} total={incomeTotal} currency={currency} />
        </section>
      )}

      {/* 予算 */}
      {(totalBudget || budgetRows.length > 0) && (
        <section className="mb-7">
          <h2 className="mb-2.5 text-[15px] font-semibold">予算と実績</h2>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border-subtle text-text-tertiary">
                <th className="py-1.5 text-left font-medium">対象</th>
                <th className="py-1.5 text-right font-medium">予算</th>
                <th className="py-1.5 text-right font-medium">実績</th>
                <th className="py-1.5 text-right font-medium">残り</th>
              </tr>
            </thead>
            <tbody>
              {totalBudget && (
                <BudgetRow
                  name="全体"
                  amount={totalBudget.amount}
                  spent={totalBudget.spent}
                  currency={currency}
                />
              )}
              {budgetRows.map((b) => (
                <BudgetRow key={b.name} {...b} currency={currency} />
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 固定費・資産 */}
      <section className="mb-7 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border-subtle p-3.5">
          <div className="text-[12px] text-text-tertiary">サブスクの月額</div>
          <div className="mt-0.5 text-[18px] font-bold tabular-nums">
            {formatMoney(subscriptionMonthly, currency)}
          </div>
          <div className="mt-0.5 text-[12px] text-text-tertiary">{subscriptionCount}件</div>
        </div>
        {asset ? (
          <div className="rounded-xl border border-border-subtle p-3.5">
            <div className="text-[12px] text-text-tertiary">
              資産（{asset.monthLabel}時点の記録）
            </div>
            <div className="mt-0.5 text-[18px] font-bold tabular-nums">
              {formatMoney(asset.amount, currency)}
            </div>
            {asset.diff !== null && (
              <div
                className={cn(
                  "mt-0.5 text-[12px] tabular-nums",
                  asset.diff > 0 ? "text-income" : asset.diff < 0 ? "text-expense" : "text-text-tertiary",
                )}
              >
                前の記録から {asset.diff > 0 ? "+" : ""}
                {formatMoney(asset.diff, currency)}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border-subtle p-3.5">
            <div className="text-[12px] text-text-tertiary">記録の付き方</div>
            <div className="mt-0.5 text-[18px] font-bold tabular-nums">{transactionCount}件</div>
            <div className="mt-0.5 text-[12px] text-text-tertiary">{recordedDays}日に記録</div>
          </div>
        )}
      </section>

      {/* 健康度 */}
      {health.measured > 0 && (
        <section className="mb-7">
          <h2 className="mb-2.5 text-[15px] font-semibold">家計の健康度</h2>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-[28px] font-bold tabular-nums">{health.score}</span>
            <span className="text-[13px] text-text-secondary">
              点（{LEVEL_LABEL[health.level]}）
            </span>
          </div>
          <ul className="space-y-1.5 text-[13px]">
            {health.factors.map((f) => (
              <li key={f.key} className="flex gap-2">
                <span className="w-28 shrink-0 text-text-tertiary">{f.label}</span>
                <span className="min-w-0 flex-1">
                  <span className="tabular-nums">
                    {f.score === null ? "判定できません" : `${f.score} / ${f.max}`}
                  </span>
                  <span className="block text-[12px] leading-relaxed text-text-secondary">
                    {f.evidence}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-border-subtle pt-3 text-[11px] leading-relaxed text-text-tertiary">
        金額はすべて記録どおりの数字で、推測は含みません。健康度は、上に書いた
        4つの見方だけで出しています。
      </footer>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "expense";
}) {
  return (
    <div className="rounded-xl border border-border-subtle p-3">
      <div className="text-[12px] text-text-tertiary">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-[17px] font-bold tabular-nums",
          tone === "income" ? "text-income" : "text-expense",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Breakdown({
  rows,
  total,
  currency,
}: {
  rows: Row[];
  total: number;
  currency: string;
}) {
  if (rows.length === 0) {
    return <p className="text-[13px] text-text-tertiary">記録がありません。</p>;
  }
  return (
    <table className="w-full text-[13px]">
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="border-b border-border-subtle last:border-0">
            <td className="py-1.5">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: colorOf(r.color) }}
                />
                <span className="min-w-0">
                  {r.name}
                  {r.children.length > 0 && (
                    <span className="block text-[11px] text-text-tertiary">
                      内訳: {r.children.map((c) => `${c.name} ${formatMoney(c.amount, currency)}`).join(" / ")}
                    </span>
                  )}
                </span>
              </span>
            </td>
            <td className="w-24 py-1.5 text-right tabular-nums">
              {formatMoney(r.amount, currency)}
            </td>
            <td className="w-14 py-1.5 text-right tabular-nums text-text-tertiary">
              {total > 0 ? `${Math.round((r.amount / total) * 100)}%` : "—"}
            </td>
          </tr>
        ))}
        <tr className="border-t-2 border-border-strong font-semibold">
          <td className="py-1.5">合計</td>
          <td className="py-1.5 text-right tabular-nums">{formatMoney(total, currency)}</td>
          <td className="py-1.5 text-right tabular-nums text-text-tertiary">100%</td>
        </tr>
      </tbody>
    </table>
  );
}

function BudgetRow({
  name,
  amount,
  spent,
  currency,
}: {
  name: string;
  amount: number;
  spent: number;
  currency: string;
}) {
  const left = amount - spent;
  return (
    <tr className="border-b border-border-subtle last:border-0">
      <td className="py-1.5">{name}</td>
      <td className="py-1.5 text-right tabular-nums">{formatMoney(amount, currency)}</td>
      <td className="py-1.5 text-right tabular-nums">{formatMoney(spent, currency)}</td>
      <td
        className={cn(
          "py-1.5 text-right tabular-nums",
          left < 0 ? "text-expense" : "text-text-secondary",
        )}
      >
        {left < 0 ? `${formatMoney(-left, currency)} 超過` : formatMoney(left, currency)}
      </td>
    </tr>
  );
}
