import type { Metadata } from "next";
import Link from "next/link";
import { getAppContext, resolveMonth, monthParam } from "@/lib/app-context";
import { getDashboardData } from "@/lib/dashboard";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { MonthSwitcher } from "@/components/app/month-switcher";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ActivityRing } from "@/components/ui/activity-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryDonut } from "@/components/ui/chart/charts";
import { BudgetGauge } from "@/components/app/budget-gauge";
import { AdSlot } from "@/components/ads/ad-slot";
import {
  CategoryIcon,
  ClockIcon,
  RepeatIcon,
  ChevronRightIcon,
  SparklesIcon,
  BellIcon,
  WalletIcon,
  TargetIcon,
} from "@/components/icons";
import { formatMoney, amountToWorkMinutes, formatWorkTime, toMonthlyAmount } from "@/lib/money";
import { colorOf } from "@/lib/colors";
import { buildActivityRings } from "@/lib/activity-rings";
import { formatDate, formatMonth } from "@/lib/date";
import { type BillingCycle } from "@/lib/enums";
import { clientEnv } from "@/lib/env";
import { pageMetadata, SITE } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "ホーム", noindex: true });

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { ledgerId, user, tier, isPod, currency } = await getAppContext();
  const { m } = await searchParams;
  const month = resolveMonth(m);

  const { summary, subTotals, totalBudget, byCategory, upcoming, wasteful, recent, showBudget } =
    await getDashboardData(ledgerId, tier, month);

  const wage = user.assumedHourlyWage ?? 0;
  const expenseRatio = summary.income > 0 ? summary.expense / summary.income : 0;

  return (
    <PageContainer>
      <PageHeader
        title={`こんにちは${user.name ? `、${user.name}さん` : ""}`}
        subtitle={isPod ? "共有帳簿" : undefined}
        action={<MonthSwitcher current={monthParam(month)} />}
      />

      {/* クイック操作 */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { href: "/transactions", icon: WalletIcon, label: "記録する" },
          { href: "/subscriptions", icon: RepeatIcon, label: "サブスク" },
          { href: showBudget ? "/budgets" : "/billing", icon: TargetIcon, label: "予算" },
        ].map((q) => (
          <Link
            key={q.label}
            href={q.href}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border-subtle bg-surface-1 py-4 text-[13px] font-medium shadow-sm transition hover:bg-surface-2"
          >
            <q.icon size={22} className="text-accent" />
            {q.label}
          </Link>
        ))}
      </div>

      {/* コストタイム */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>コストタイム</CardTitle>
            <Badge tone="accent" size="sm">{formatMonth(month)}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          {wage > 0 ? (
            <div className="flex items-center gap-6">
              <ActivityRing
                size={150}
                thickness={14}
                tracks={[
                  { value: 1, color: "var(--color-income)" },
                  { value: expenseRatio, color: "var(--color-expense)" },
                ]}
              >
                <div>
                  <div className="text-[11px] text-text-tertiary">支出を時間に換算</div>
                  <div className="text-[18px] font-bold leading-tight">
                    {formatWorkTime(amountToWorkMinutes(summary.expense, wage))}
                  </div>
                </div>
              </ActivityRing>
              <div className="flex-1 space-y-3 text-[14px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span className="h-2.5 w-2.5 rounded-full bg-income" />稼いだ時間
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatWorkTime(amountToWorkMinutes(summary.income, wage))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span className="h-2.5 w-2.5 rounded-full bg-expense" />使った時間
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatWorkTime(amountToWorkMinutes(summary.expense, wage))}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-text-tertiary">
                  想定時給 {formatMoney(wage, currency)} で換算。支出は「働いた時間」何ぶんかで考えられます。
                </p>
              </div>
            </div>
          ) : (
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-4 transition hover:opacity-80"
            >
              <ClockIcon size={24} className="text-accent" />
              <span className="flex-1 text-[14px]">
                想定時給を設定すると、支出を「時間」で見られます。
              </span>
              <ChevronRightIcon size={18} className="text-text-tertiary" />
            </Link>
          )}
        </CardBody>
      </Card>

      {/* 今月のサマリー */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-[12px] text-text-tertiary">
            <span className="h-2 w-2 rounded-full bg-income" />収入
          </div>
          <div className="mt-1 text-[18px] font-bold tabular-nums text-income">
            {formatMoney(summary.income, currency)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-[12px] text-text-tertiary">
            <span className="h-2 w-2 rounded-full bg-expense" />支出
          </div>
          <div className="mt-1 text-[18px] font-bold tabular-nums">{formatMoney(summary.expense, currency)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-[12px] text-text-tertiary">
            <RepeatIcon size={13} className="text-accent" />サブスク月額
          </div>
          <div className="mt-1 text-[18px] font-bold tabular-nums">{formatMoney(subTotals.monthly, currency)}</div>
        </Card>
      </div>

      {/* 今月のアクティビティ（Apple フィットネス風 3 重リング） */}
      {(() => {
        const { rings, show } = buildActivityRings(summary, totalBudget, subTotals.monthly);
        if (!show) return null;
        const savings = rings.find((r) => r.key === "savings")!;
        return (
          <Card className="mb-5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>今月のアクティビティ</CardTitle>
                <Badge tone="accent" size="sm">
                  {formatMonth(month)}
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex items-center gap-6">
                <ActivityRing
                  size={150}
                  thickness={13}
                  tracks={rings.map((r) => ({ value: r.value, color: r.color }))}
                >
                  <div>
                    <div className="text-[11px] text-text-tertiary">貯蓄</div>
                    <div className="text-[17px] font-bold leading-tight tabular-nums">
                      {formatMoney(savings.amount, currency)}
                    </div>
                  </div>
                </ActivityRing>
                <div className="flex-1 space-y-3 text-[13px]">
                  {rings.map((r) => (
                    <div key={r.key} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-text-secondary">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                        {r.label}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {Math.round(r.value * 100)}% ・ {formatMoney(r.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        );
      })()}

      {/* 予算の進捗（PLUS 以上・全体予算が設定済みの場合） */}
      {totalBudget && (
        <Card className="mb-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>予算</CardTitle>
              <Link href="/budgets" className="text-[13px] text-accent">
                予算を見る
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            <BudgetGauge
              spent={totalBudget.spent}
              amount={totalBudget.amount}
              currency={currency}
              month={month}
            />
          </CardBody>
        </Card>
      )}

      {/* カテゴリ別の支出（今月の内訳をひと目で） */}
      {byCategory.length > 0 && (
        <Card className="mb-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>カテゴリ別の支出</CardTitle>
              <Link href="/reports" className="text-[13px] text-accent">
                分析を見る
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {(() => {
              const totalExpense = byCategory.reduce((s, c) => s + c.amount, 0);
              return (
                <div className="grid items-center gap-5 sm:grid-cols-2">
                  <CategoryDonut data={byCategory} />
                  <div className="space-y-2">
                    {byCategory.map((c) => (
                      <div key={c.name} className="flex items-center gap-3">
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white"
                          style={{ background: colorOf(c.color) }}
                        >
                          <CategoryIcon name={c.icon} size={14} />
                        </span>
                        <span className="flex-1 truncate text-[13px]">{c.name}</span>
                        <span className="text-[12px] text-text-tertiary tabular-nums">
                          {totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0}%
                        </span>
                        <span className="w-20 text-right text-[13px] font-semibold tabular-nums">
                          {formatMoney(c.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 近づく更新 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>近づく更新</CardTitle>
              <Link href="/subscriptions" className="text-[13px] text-accent">
                すべて見る
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<BellIcon size={24} />}
                title="直近の更新はありません"
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <div className="-mx-1 space-y-1">
                {upcoming.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-text-secondary">
                      <CategoryIcon name={s.category?.icon ?? "repeat"} size={18} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[14px] font-medium">{s.name}</span>
                      <span className="block text-[12px] text-text-tertiary">
                        {formatDate(s.nextRenewalAt, "M月d日")}
                        {s.d === 0 ? " ・ 今日" : ` ・ あと${s.d}日`}
                      </span>
                    </span>
                    <span className="text-[14px] font-semibold tabular-nums">
                      {formatMoney(toMonthlyAmount(s.amount, s.cycle as BillingCycle), currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* アンビエントな見直し提案 */}
        <Card className={wasteful.length > 0 ? "ambient" : undefined}>
          <CardHeader>
            <CardTitle>見直しのヒント</CardTitle>
          </CardHeader>
          <CardBody>
            {wasteful.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-4">
                <SparklesIcon size={22} className="text-success" />
                <span className="text-[14px] text-text-secondary">
                  しばらく使っていないサブスクはありません。良い状態です。
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {wasteful.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl bg-warning/8 px-4 py-3">
                    <RepeatIcon size={20} className="text-warning" />
                    <span className="flex-1 text-[14px]">
                      <b>{s.name}</b> をしばらく利用していません。
                    </span>
                  </div>
                ))}
                <ButtonLink href="/subscriptions" variant="tinted" full size="sm">
                  サブスクを見直す
                </ButtonLink>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* 最近の取引 */}
      <Card className="mt-5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>最近の取引</CardTitle>
            <Link href="/transactions" className="text-[13px] text-accent">
              すべて見る
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {recent.length === 0 ? (
            <EmptyState
              icon={<WalletIcon size={24} />}
              title="まだ記録がありません"
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <div className="-mx-1 space-y-0.5">
              {recent.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full ${
                      t.type === "INCOME" ? "bg-income/12 text-income" : "bg-surface-2 text-text-secondary"
                    }`}
                  >
                    <CategoryIcon name={t.category?.icon ?? "tag"} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">
                      {t.category?.name ?? "未分類"}
                      {t.memo ? (
                        <span className="font-normal text-text-tertiary"> ・ {t.memo}</span>
                      ) : null}
                    </span>
                    <span className="block text-[12px] text-text-tertiary">
                      {formatDate(t.occurredAt, "M月d日")}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[14px] font-semibold tabular-nums ${
                      t.type === "INCOME" ? "text-income" : "text-text-primary"
                    }`}
                  >
                    {t.type === "INCOME" ? "+" : "−"}
                    {formatMoney(t.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* 広告（FREE のみ／キーが無ければ自社訴求） */}
      <AdSlot
        tier={tier}
        adsenseClient={clientEnv.NEXT_PUBLIC_ADSENSE_CLIENT}
        className="mt-5"
      />

      <p className="mt-8 text-center text-[12px] text-text-tertiary">
        {SITE.name} ・ あなたのお金を、美しく積み上げる。
      </p>
    </PageContainer>
  );
}
