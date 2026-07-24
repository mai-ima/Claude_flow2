import { getDate, getDaysInMonth } from "date-fns";

/**
 * 今月の支出ペースから月末の着地額を予測（線形）。
 * 月初や 0 支出では spent をそのまま返す。純関数・テスト可能。
 */
export function monthEndForecast(spent: number, now: Date = new Date()): number {
  const day = getDate(now);
  const days = getDaysInMonth(now);
  if (day <= 0 || spent <= 0) return Math.max(0, spent);
  return Math.round((spent / day) * days);
}

export type WeekTrend = "up" | "down" | "flat";

export interface WeekDelta {
  diff: number; // 今週 − 先週
  pct: number | null; // 先週比（先週0なら null）
  trend: WeekTrend;
}

/** 今週と先週の支出を比較。 */
export function weekDelta(thisWeek: number, lastWeek: number): WeekDelta {
  const diff = thisWeek - lastWeek;
  const pct = lastWeek > 0 ? Math.round((diff / lastWeek) * 100) : null;
  const trend: WeekTrend = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  return { diff, pct, trend };
}

/**
 * 貯蓄率 (収入 − 支出) / 収入 をパーセントで返す。
 * 収入が無い月は算出不能として null（0% と区別する）。
 * 支出が収入を上回る月は負の値になる。
 */
export function savingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null;
  return Math.round(((income - expense) / income) * 100);
}
