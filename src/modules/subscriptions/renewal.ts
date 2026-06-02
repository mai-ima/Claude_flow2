import { advanceRenewal } from "@/lib/date";
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

/** 更新が reminderDaysBefore 以内（当日〜）かどうか。 */
export function isReminderDue(
  nextRenewalAt: Date,
  reminderDaysBefore: number,
  now: Date,
): boolean {
  const ms = nextRenewalAt.getTime() - now.getTime();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return days >= 0 && days <= reminderDaysBefore;
}
