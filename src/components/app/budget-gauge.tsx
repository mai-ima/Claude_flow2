import { ActivityRing } from "@/components/ui/activity-ring";
import { Badge } from "@/components/ui/badge";
import { budgetInsight, PACE_LABEL, type BudgetHealth, type BudgetInsight } from "@/lib/budget-insight";
import { formatMoney } from "@/lib/money";

const HEALTH_COLOR: Record<BudgetHealth, string> = {
  safe: "var(--color-accent)",
  warning: "var(--color-warning)",
  over: "var(--color-expense)",
};

const PACE_TONE: Record<BudgetInsight["pace"], "income" | "warning" | "expense"> = {
  good: "income",
  tight: "warning",
  over: "expense",
};

/**
 * 予算の進捗をリング + 示唆（1日あたり・ペース）で可視化する共通表示部品。
 * 予算ページとダッシュボードの両方で再利用する（純表示・server/client 両対応）。
 */
export function BudgetGauge({
  spent,
  amount,
  currency = "JPY",
  month,
  size = 132,
  thickness = 13,
  showInsight = true,
}: {
  spent: number;
  amount: number;
  currency?: string;
  month?: Date;
  size?: number;
  thickness?: number;
  showInsight?: boolean;
}) {
  const ins = budgetInsight(spent, amount, month);
  const color = HEALTH_COLOR[ins.health];
  const pct = Math.min(100, Math.round(ins.ratio * 100));

  return (
    <div className="flex items-center gap-5">
      <ActivityRing size={size} thickness={thickness} tracks={[{ value: ins.ratio, color }]}>
        <div className="text-center">
          <div className="text-[10px] text-text-tertiary">{ins.over ? "超過" : "残り"}</div>
          <div className="text-[15px] font-bold leading-tight tabular-nums">
            {formatMoney(ins.over ? -ins.remaining : ins.remaining, currency)}
          </div>
          <div className="text-[11px] text-text-tertiary tabular-nums">{pct}%</div>
        </div>
      </ActivityRing>

      {showInsight && (
        <div className="flex-1 space-y-2.5 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">使用</span>
            <span className="font-semibold tabular-nums">
              {formatMoney(spent, currency)} / {formatMoney(amount, currency)}
            </span>
          </div>
          {!ins.over && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">1日あたり使える</span>
              <span className="font-semibold tabular-nums">{formatMoney(ins.dailyAllowance, currency)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-text-secondary tabular-nums">残り{ins.daysLeft}日</span>
            <Badge tone={PACE_TONE[ins.pace]} size="sm">
              {PACE_LABEL[ins.pace]}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
