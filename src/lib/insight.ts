import { dayOfMonthJST, daysInMonthJST } from "./date";

/**
 * 予測を出すのに要る最低の経過日数。
 *
 * 1日や2日で割ると、その日の1回の買い物がそのまま月末まで続く前提になり、
 * 月初に家賃を払っただけで「今月は50万円」のような数字が出る。
 * 実際にそうなった（8月1日に着地予測 511万円と表示された）。
 */
export const FORECAST_MIN_DAYS = 3;

/**
 * 今月の支出ペースから月末の着地額を予測（線形）。
 *
 * spent には「今日までに使った額」を渡すこと。その月の全支出を渡すと、
 * 先の日付で入れた記録（旅行の予定など）まで分子に入り、
 * 経過日数で割った瞬間に実態とかけ離れた数字になる。
 *
 * まだ日が浅くて予測できないときは null。数字を出さないほうが、
 * 当てにならない数字を出すより正直でいられる。
 */
export function monthEndForecast(spent: number, now: Date = new Date()): number | null {
  // 日にちと日数は日本時間で数える。サーバーが UTC のままだと、
  // 日本時間の朝9時までは前日として数えられ、予測が1日ぶんずれる。
  const day = dayOfMonthJST(now);
  const days = daysInMonthJST(now);
  // 日数の判定を先に行う。支出0を先に見ると、月の1日目で
  // 「￥0・このペースが続いた場合」と出て、今月は0円で終わると読める。
  if (day < FORECAST_MIN_DAYS) return null;
  if (spent <= 0) return 0;
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
