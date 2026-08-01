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
 *
 * ここが効かなかった場合に黙って動き続けないよう、実際の時間帯を
 * 確かめて記録に残す。/api/health からも現在の時間帯を確認できる。
 * なお日付の切り出し・入力欄の値・書き出しは、この設定に頼らず
 * src/lib/date.ts の日本時間の関数を通している（二重の備え）。
 */
import { APP_TIME_ZONE } from "@/lib/date";
import { logger } from "@/lib/logger";

export function register() {
  if (!process.env.TZ) {
    process.env.TZ = APP_TIME_ZONE;
  }

  const actual = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (actual !== APP_TIME_ZONE) {
    logger.warn("時間帯が日本時間になっていません", {
      expected: APP_TIME_ZONE,
      actual,
      TZ: process.env.TZ,
    });
  }
}
