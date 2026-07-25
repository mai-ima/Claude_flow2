"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import { colorOf } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { CategoryIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";

const CHART_H = 240;

/**
 * 全チャート共通のレスポンシブ枠。
 * initialDimension を与えないと、ResizeObserver の初回通知までに幅 0 と
 * 判定された場合にグラフが描画されないままになるため必ず指定する。
 */
function ChartFrame({ children }: { children: React.ReactElement }) {
  return (
    <ResponsiveContainer
      width="100%"
      height={CHART_H}
      minWidth={0}
      initialDimension={{ width: 320, height: CHART_H }}
    >
      {children}
    </ResponsiveContainer>
  );
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}
function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 px-3 py-2 text-[12px] shadow-md">
      {label && <div className="mb-1 font-medium">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-text-secondary">{p.name}</span>
          <span className="ml-auto font-semibold tabular-nums">{formatMoney(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendAreaChart({
  data,
}: {
  data: { label: string; income: number; expense: number }[];
}) {
  return (
    <ChartFrame>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-income)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-income)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-expense)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-expense)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
        />
        <Tooltip content={<MoneyTooltip />} />
        <Area
          type="monotone"
          name="収入"
          dataKey="income"
          stroke="var(--color-income)"
          strokeWidth={2}
          fill="url(#inc)"
          animationDuration={500}
        />
        <Area
          type="monotone"
          name="支出"
          dataKey="expense"
          stroke="var(--color-expense)"
          strokeWidth={2}
          fill="url(#exp)"
          animationDuration={500}
        />
      </AreaChart>
    </ChartFrame>
  );
}

export function CategoryDonut({
  data,
  center,
}: {
  data: { name: string; amount: number; color: string }[];
  /** ドーナツ中央に重ねる任意の表示（合計など）。 */
  center?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <ChartFrame>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius={62}
            outerRadius={96}
            paddingAngle={2}
            stroke="none"
            animationDuration={500}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={colorOf(d.color)} />
            ))}
          </Pie>
          <Tooltip content={<MoneyTooltip />} />
        </PieChart>
      </ChartFrame>
      {center && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">{center}</div>
        </div>
      )}
    </div>
  );
}

/** 月次の棒グラフ（年間の支出/収入用）。 */
export function MonthlyBarChart({
  data,
  tone,
}: {
  data: { label: string; amount: number }[];
  tone: "income" | "expense";
}) {
  const color = tone === "income" ? "var(--color-income)" : "var(--color-expense)";
  return (
    <ChartFrame>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }}
        />
        <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--color-surface-2)" }} />
        <Bar
          name={tone === "income" ? "収入" : "支出"}
          dataKey="amount"
          fill={color}
          radius={[6, 6, 0, 0]}
          animationDuration={500}
        />
      </BarChart>
    </ChartFrame>
  );
}

/** 割合（％）の推移。貯蓄率タブ用。 */
export function RateLineChart({ data }: { data: { label: string; rate: number }[] }) {
  return (
    <ChartFrame>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={38}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const v = payload[0].value as number;
            return (
              <div className="rounded-xl border border-border-subtle bg-surface-1 px-3 py-2 text-[12px] shadow-md">
                <div className="mb-1 font-medium">{label}</div>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary">貯蓄率</span>
                  <span className="ml-auto font-semibold tabular-nums">{v}%</span>
                </div>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          name="貯蓄率"
          dataKey="rate"
          stroke="var(--color-accent)"
          strokeWidth={2}
          dot={{ r: 3 }}
          animationDuration={500}
        />
      </LineChart>
    </ChartFrame>
  );
}

export interface BudgetBarRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  spent: number;
}

/**
 * 予算 vs 実績の横棒。予算タブ用。
 * 件数が少なく1行が細いため、recharts ではなく CSS バーで描く
 * （軽量・スマホで読みやすく、金額と残額を同じ行に併記できる）。
 */
export function BudgetBars({
  rows,
  currency,
}: {
  rows: BudgetBarRow[];
  currency: string;
}) {
  return (
    <div className="space-y-4">
      {rows.map((b) => {
        const ratio = b.amount > 0 ? b.spent / b.amount : 0;
        const pct = Math.min(100, Math.round(ratio * 100));
        const over = b.spent > b.amount;
        const remaining = b.amount - b.spent;
        return (
          <div key={b.id}>
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white"
                style={{ background: colorOf(b.color) }}
              >
                <CategoryIcon name={b.icon} size={14} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{b.name}</span>
              {over && (
                <Badge tone="expense" size="sm">
                  超過
                </Badge>
              )}
              <span className="shrink-0 text-[13px] tabular-nums text-text-tertiary">
                {Math.round(ratio * 100)}%
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-label={`${b.name} の予算消化`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-[var(--dur-2)] ease-spring",
                  over ? "bg-expense" : "bg-accent",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[12px] tabular-nums text-text-tertiary">
              <span>
                {formatMoney(b.spent, currency)} / {formatMoney(b.amount, currency)}
              </span>
              <span className={over ? "text-expense" : undefined}>
                {over
                  ? `${formatMoney(-remaining, currency)} 超過`
                  : `残り ${formatMoney(remaining, currency)}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
