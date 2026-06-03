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
