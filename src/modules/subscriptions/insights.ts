import { toYearlyAmount, amountToWorkMinutes } from "@/lib/money";
import type { BillingCycle } from "@/lib/enums";

/**
 * サブスクの判断材料。すべて手元のデータの集計で、外部には何も送らない。
 *
 * どの数字も「なぜそう言えるか」を一緒に返す。
 * 結論だけ出しても、利用者は確かめようがない。
 */

/** 値上げ1件分。 */
export interface PriceChangeRow {
  subscriptionId: string;
  name: string;
  oldAmount: number;
  newAmount: number;
  changedAt: Date;
}

export interface PriceChangeSummary extends PriceChangeRow {
  /** 差額（プラスが値上げ）。 */
  diff: number;
  /** 変化率（%）。元が0なら null。 */
  percent: number | null;
  /** この変化が年額に与える影響。 */
  yearlyDiff: number;
}

/**
 * 値上げ・値下げの一覧を、影響の大きい順に並べる。
 * 並び順は「年額でいくら変わったか」。月額の差が小さくても、
 * 年払いなら効きが大きいことがある。
 */
export function summarizePriceChanges(
  rows: (PriceChangeRow & { cycle: BillingCycle })[],
): PriceChangeSummary[] {
  return rows
    .map((r) => {
      const diff = r.newAmount - r.oldAmount;
      return {
        ...r,
        diff,
        percent: r.oldAmount > 0 ? (diff / r.oldAmount) * 100 : null,
        yearlyDiff: toYearlyAmount(r.newAmount, r.cycle) - toYearlyAmount(r.oldAmount, r.cycle),
      };
    })
    .sort((a, b) => Math.abs(b.yearlyDiff) - Math.abs(a.yearlyDiff));
}

/** 解約したときの効き目。 */
export interface CancelImpact {
  /** 年間で浮く額。 */
  yearly: number;
  /** 月あたりに直した額。 */
  monthly: number;
  /** 想定時給が設定されていれば、その年額が何分の労働に当たるか。 */
  workMinutes: number | null;
}

export function cancelImpact(
  amount: number,
  cycle: BillingCycle,
  hourlyWage: number | null,
): CancelImpact {
  const yearly = toYearlyAmount(amount, cycle);
  return {
    yearly,
    monthly: Math.round(yearly / 12),
    workMinutes: hourlyWage && hourlyWage > 0 ? amountToWorkMinutes(yearly, hourlyWage) : null,
  };
}

/**
 * 利用期間。開始日が未記録なら null。
 * 「2年3ヶ月」のような粗さで足りる（日単位の正確さに意味は無い）。
 */
export function usagePeriod(
  startedAt: Date | null,
  now: Date = new Date(),
): { months: number; label: string } | null {
  if (!startedAt) return null;
  const months =
    (now.getFullYear() - startedAt.getFullYear()) * 12 +
    (now.getMonth() - startedAt.getMonth()) -
    (now.getDate() < startedAt.getDate() ? 1 : 0);
  if (months < 0) return null;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  const label =
    years > 0 ? (rest > 0 ? `${years}年${rest}ヶ月` : `${years}年`) : `${Math.max(months, 0)}ヶ月`;
  return { months, label };
}

/**
 * 開始日からの累計支払額の見積り。
 *
 * 実際の支払い記録ではなく、現在の金額 × 経過した請求回数。
 * 途中で値上げがあった場合はずれるので、画面では「およそ」と添えること。
 */
export function estimatedTotalPaid(
  amount: number,
  cycle: BillingCycle,
  startedAt: Date | null,
  now: Date = new Date(),
): number | null {
  const period = usagePeriod(startedAt, now);
  if (!period) return null;
  const yearly = toYearlyAmount(amount, cycle);
  return Math.round((yearly / 12) * period.months);
}

/** レビューからの経過。未レビューは null。 */
export function reviewAge(
  lastReviewedAt: Date | null,
  now: Date = new Date(),
): { days: number; label: string } | null {
  if (!lastReviewedAt) return null;
  const days = Math.floor((now.getTime() - lastReviewedAt.getTime()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return { days, label: "今日" };
  if (days < 31) return { days, label: `${days}日前` };
  const months = Math.floor(days / 30);
  if (months < 12) return { days, label: `${months}ヶ月前` };
  return { days, label: `${Math.floor(months / 12)}年前` };
}

/** 棚卸しを促す間隔。四半期ごとに見直せば十分。 */
export const REVIEW_INTERVAL_DAYS = 90;

/** 見直したほうがよいか。未レビューも対象にする。 */
export function needsReview(lastReviewedAt: Date | null, now: Date = new Date()): boolean {
  const age = reviewAge(lastReviewedAt, now);
  return age === null || age.days >= REVIEW_INTERVAL_DAYS;
}
