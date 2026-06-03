import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";
import { ja } from "date-fns/locale";
import type { BillingCycle } from "./enums";

export function formatDate(date: Date, pattern = "yyyy年M月d日"): string {
  return format(date, pattern, { locale: ja });
}

export function formatMonth(date: Date): string {
  return format(date, "yyyy年M月", { locale: ja });
}

export function monthRange(anchor: Date): { start: Date; end: Date } {
  return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
}

/** 次の更新日を周期に応じて進める。 */
export function advanceRenewal(date: Date, cycle: BillingCycle): Date {
  switch (cycle) {
    case "MONTHLY":
      return addMonths(date, 1);
    case "YEARLY":
      return addYears(date, 1);
    case "WEEKLY":
      return addWeeks(date, 1);
    case "QUARTERLY":
      return addMonths(date, 3);
  }
}

/** 今日から見た残り日数（過ぎていれば負）。 */
export function daysUntil(date: Date, from: Date = new Date()): number {
  return differenceInCalendarDays(date, from);
}

/** 最終利用日からの経過日数。null は未記録。 */
export function daysSince(date: Date | null, from: Date = new Date()): number | null {
  if (!date) return null;
  return differenceInCalendarDays(from, date);
}

/** 今日から見た残り月数（暦月差）。過ぎていれば負。 */
export function monthsUntil(date: Date, from: Date = new Date()): number {
  return differenceInCalendarMonths(date, from);
}
