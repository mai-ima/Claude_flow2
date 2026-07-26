import {
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  differenceInCalendarMonths,
} from "date-fns";
import { advanceRenewal, daysUntil } from "@/lib/date";
import type { BillingCycle } from "@/lib/enums";

/**
 * 更新日が現在以前なら、取りこぼした周期分の発生日を列挙し、次回更新日を返す。
 * 純関数（DB 非依存）でテスト可能。maxGuard で暴走を防止。
 */
export function renewalCatchup(
  nextRenewalAt: Date,
  cycle: BillingCycle,
  now: Date,
  maxGuard = 24,
): { occurrences: Date[]; nextRenewalAt: Date } {
  const occurrences: Date[] = [];
  let next = nextRenewalAt;
  let guard = 0;
  while (next <= now && guard < maxGuard) {
    occurrences.push(next);
    next = advanceRenewal(next, cycle);
    guard++;
  }
  return { occurrences, nextRenewalAt: next };
}

/**
 * 更新が reminderDaysBefore 以内（当日〜）かどうか。
 *
 * 判定は「暦日の差」で行う。ミリ秒差を切り上げると時刻に左右され、
 * 例えば 6/1 01:00 時点で 6/4 23:00 の更新が「4日後」となり通知されない。
 * 利用者の感覚（あと何日）に合うのは暦日差。
 */
export function isReminderDue(
  nextRenewalAt: Date,
  reminderDaysBefore: number,
  now: Date,
): boolean {
  const days = daysUntil(nextRenewalAt, now);
  return days >= 0 && days <= reminderDaysBefore;
}

/**
 * 更新日を `from` 以降の最初の発生日まで一度に進める。
 *
 * 支払い予定の集計で、過去のままの更新日から1周期ずつ回すと、
 * 週次のサブスクでは打ち切りガードに達して後半の月が 0 件になっていた。
 * 周期は等間隔なので、必要な回数を算術で求めて一度に進める。
 */
export function advanceTo(start: Date, cycle: BillingCycle, from: Date): Date {
  if (start >= from) return start;
  const months =
    cycle === "MONTHLY" ? 1 : cycle === "QUARTERLY" ? 3 : cycle === "YEARLY" ? 12 : 0;
  if (months > 0) {
    const diff = differenceInCalendarMonths(from, start);
    const steps = Math.max(0, Math.floor(diff / months));
    let d = addMonths(start, steps * months);
    // 端数（同月内の日付差）を1周期だけ調整する。
    while (d < from) d = addMonths(d, months);
    return d;
  }
  // WEEKLY
  const days = differenceInCalendarDays(from, start);
  const steps = Math.max(0, Math.floor(days / 7));
  let d = addWeeks(start, steps);
  while (d < from) d = addWeeks(d, 1);
  return d;
}
