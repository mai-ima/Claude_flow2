import { advanceRenewal } from "@/lib/date";
import type { BillingCycle } from "@/lib/enums";
import { daysUntil } from "@/lib/date";

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
