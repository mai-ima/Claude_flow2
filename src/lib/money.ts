import type { BillingCycle } from "./enums";

/**
 * 金額は最小単位の整数で保持（JPY は小数なし＝円）。浮動小数を排除。
 */

export function formatMoney(amount: number, currency = "JPY"): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amount);
}

/** サブスク金額を「月額」に正規化する。 */
export function toMonthlyAmount(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "MONTHLY":
      return amount;
    case "YEARLY":
      return Math.round(amount / 12);
    case "WEEKLY":
      return Math.round((amount * 52) / 12);
    case "QUARTERLY":
      return Math.round(amount / 3);
  }
}

/** サブスク金額を「年額」に換算する。 */
export function toYearlyAmount(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "MONTHLY":
      return amount * 12;
    case "YEARLY":
      return amount;
    case "WEEKLY":
      return amount * 52;
    case "QUARTERLY":
      return amount * 4;
  }
}

/**
 * コストタイム: 金額を想定時給で「労働時間」に換算（分単位の整数）。
 */
export function amountToWorkMinutes(amount: number, hourlyWage: number): number {
  if (hourlyWage <= 0) return 0;
  return Math.round((amount / hourlyWage) * 60);
}

/** 労働時間（分）を「◯時間◯分」の日本語に整形。 */
export function formatWorkTime(minutes: number): string {
  if (minutes <= 0) return "0分";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}時間${m}分`;
  if (h > 0) return `${h}時間`;
  return `${m}分`;
}
