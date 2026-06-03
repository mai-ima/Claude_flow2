import { getDate, getDaysInMonth, isSameMonth } from "date-fns";

/** 予算の健全度。安全 / 注意(80%以上) / 超過(100%超)。 */
export type BudgetHealth = "safe" | "warning" | "over";

export function budgetHealth(spent: number, amount: number): BudgetHealth {
  if (amount <= 0) return "safe";
  const ratio = spent / amount;
  if (ratio > 1) return "over";
  if (ratio >= 0.8) return "warning";
  return "safe";
}

export interface BudgetInsight {
  ratio: number;
  remaining: number;
  over: boolean;
  health: BudgetHealth;
  /** 当月の残り日数（今日を含む）。過月・未来月は月日数を返す。 */
  daysLeft: number;
  /** 残額 ÷ 残り日数（1日あたり使える額）。超過時は 0。 */
  dailyAllowance: number;
  /** 経過割合に対する消化割合のペース判定。 */
  pace: "good" | "tight" | "over";
}

/**
 * 予算の示唆を算出（純関数・テスト可能）。
 * 表示中の月が「今月」のときだけ日割り・ペースが意味を持つため、now と月を比較する。
 */
export function budgetInsight(
  spent: number,
  amount: number,
  month: Date = new Date(),
  now: Date = new Date(),
): BudgetInsight {
  const ratio = amount > 0 ? spent / amount : 0;
  const remaining = amount - spent;
  const over = remaining < 0;
  const health = budgetHealth(spent, amount);

  const daysInMonth = getDaysInMonth(month);
  const isCurrent = isSameMonth(month, now);
  // 今月: 今日を含む残り日数。それ以外: 月全体。
  const daysLeft = isCurrent ? Math.max(1, daysInMonth - getDate(now) + 1) : daysInMonth;
  const dailyAllowance = over ? 0 : Math.floor(remaining / daysLeft);

  // ペース: 月の経過割合より消化割合が大きいと「使いすぎ気味」。
  const elapsedRatio = isCurrent ? getDate(now) / daysInMonth : 1;
  let pace: BudgetInsight["pace"];
  if (over) pace = "over";
  else if (ratio > elapsedRatio + 0.1) pace = "tight";
  else pace = "good";

  return { ratio, remaining, over, health, daysLeft, dailyAllowance, pace };
}

export const PACE_LABEL: Record<BudgetInsight["pace"], string> = {
  good: "ペース良好",
  tight: "使いすぎ気味",
  over: "予算オーバー",
};
