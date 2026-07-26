/**
 * サーバー起動時に一度だけ実行される（リクエスト受付前）。
 *
 * 目的: サーバーのタイムゾーンを日本時間に固定する。
 * Vercel の実行環境は既定で UTC のため、`new Date()` を起点にする
 * 「今月」「今日」「残り日数」がすべて最大9時間ずれる。
 * 実測: JST 8/1 05:00 に UTC サーバーだと 7月 と判定されていた。
 *
 * 影響範囲（すべて new Date() 起点）:
 *   resolveMonth（表示中の月）/ thisMonthStart（予算の開始月）/
 *   daysUntil（更新リマインダー）/ monthlyTrend / weeklyExpenseTotals /
 *   monthEndForecast / budgetInsight（残り日数）/ 日別集計
 *
 * TZ が外から与えられている場合はそれを尊重する。
 */
export function register() {
  if (!process.env.TZ) {
    process.env.TZ = "Asia/Tokyo";
  }
}
