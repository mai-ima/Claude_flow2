"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";

const PALETTE: Record<string, string> = {
  orange: "#ff9500",
  teal: "#30b0c7",
  indigo: "#5856d6",
  yellow: "#ffcc00",
  blue: "#007aff",
  cyan: "#32ade6",
  pink: "#ff2d55",
  red: "#ff3b30",
  purple: "#af52de",
  gray: "#8e8e93",
  green: "#34c759",
  mint: "#00c7be",
};

export function colorOf(name: string): string {
  return PALETTE[name] ?? PALETTE.gray;
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
    <ResponsiveContainer width="100%" height={240}>
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
    </ResponsiveContainer>
  );
}

export function CategoryDonut({
  data,
}: {
  data: { name: string; amount: number; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
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
    </ResponsiveContainer>
  );
}
