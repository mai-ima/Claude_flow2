/**
 * 通知に添える「判定の根拠」の文言を組み立てる純関数。
 *
 * 通知本文から切り出してあるのは、ここが設計原則1「説明できること」の中身で、
 * 単体で検算できる必要があるため（AI に判定させない代わりに、何をどう測って
 * そう言っているのかを必ず数値で示す）。
 */

/** 変化率を「+26.8%」「-5.0%」の形に。基準が0以下なら率を出さない。 */
export function percentDelta(from: number, to: number): string {
  if (from <= 0) return "";
  const pct = ((to - from) / from) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/** 目標到達に必要な1日あたりの金額。残り日数0以下は1日として扱う。 */
export function perDayToGoal(remaining: number, daysLeft: number): number {
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / Math.max(1, daysLeft));
}

/** 未使用日数の言い回し。しきい値未満は通知しないので null を返す。 */
export function unusedEvidence(days: number | null, thresholdDays: number): string | null {
  if (days === null) return null;
  if (days < thresholdDays) return null;
  return `${days}日間 利用記録がありません`;
}
