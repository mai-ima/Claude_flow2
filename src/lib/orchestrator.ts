import "server-only";
import { db } from "./db";
import { advanceRenewal, daysUntil } from "./date";
import type { BillingCycle } from "./enums";

/**
 * モジュール横断の連携をここに集約（transactions ⇄ subscriptions の相互 import を避ける）。
 */

/**
 * 更新日が到来したサブスクについて、支出 Transaction を自動生成し
 * nextRenewalAt を次サイクルへ進める。生成件数を返す。
 */
export async function processRenewals(now: Date = new Date()): Promise<number> {
  const due = await db.subscription.findMany({
    where: { status: "ACTIVE", nextRenewalAt: { lte: now } },
    include: { ledger: { include: { owner: true } } },
  });

  let created = 0;
  for (const sub of due) {
    let next = sub.nextRenewalAt;
    // 取りこぼした周期分をまとめて記帳（最大24回でガード）
    let guard = 0;
    while (next <= now && guard < 24) {
      if (sub.autoPostTransaction) {
        await db.transaction.create({
          data: {
            ledgerId: sub.ledgerId,
            createdByUserId: sub.ownerUserId,
            type: "EXPENSE",
            amount: sub.amount,
            currency: sub.currency,
            occurredAt: next,
            categoryId: sub.categoryId,
            paymentMethodId: sub.paymentMethodId,
            subscriptionId: sub.id,
            memo: `${sub.name}（自動記帳）`,
          },
        });
        created++;
      }
      next = advanceRenewal(next, sub.cycle as BillingCycle);
      guard++;
    }
    if (next.getTime() !== sub.nextRenewalAt.getTime()) {
      await db.subscription.update({
        where: { id: sub.id },
        data: { nextRenewalAt: next },
      });
    }
  }
  return created;
}

export interface ReminderItem {
  subscriptionId: string;
  name: string;
  amount: number;
  daysUntil: number;
  ownerEmail: string | null;
  ownerName: string | null;
}

/** リマインダー対象（更新が reminderDaysBefore 以内）を列挙。 */
export async function dueReminders(now: Date = new Date()): Promise<ReminderItem[]> {
  const subs = await db.subscription.findMany({
    where: { status: "ACTIVE" },
    include: { owner: true },
  });
  const items: ReminderItem[] = [];
  for (const s of subs) {
    const d = daysUntil(s.nextRenewalAt, now);
    if (d >= 0 && d <= s.reminderDaysBefore) {
      items.push({
        subscriptionId: s.id,
        name: s.name,
        amount: s.amount,
        daysUntil: d,
        ownerEmail: s.owner.email,
        ownerName: s.owner.name,
      });
    }
  }
  return items;
}
