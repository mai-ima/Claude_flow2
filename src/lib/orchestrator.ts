import "server-only";
import { db } from "./db";
import { daysUntil } from "./date";
import { renewalCatchup } from "@/modules/subscriptions/renewal";
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
    const { occurrences, nextRenewalAt } = renewalCatchup(
      sub.nextRenewalAt,
      sub.cycle as BillingCycle,
      now,
    );
    if (sub.autoPostTransaction) {
      for (const occurredAt of occurrences) {
        await db.transaction.create({
          data: {
            ledgerId: sub.ledgerId,
            createdByUserId: sub.ownerUserId,
            type: "EXPENSE",
            amount: sub.amount,
            currency: sub.currency,
            occurredAt,
            categoryId: sub.categoryId,
            paymentMethodId: sub.paymentMethodId,
            subscriptionId: sub.id,
            memo: `${sub.name}（自動記帳）`,
          },
        });
        created++;
      }
    }
    if (nextRenewalAt.getTime() !== sub.nextRenewalAt.getTime()) {
      await db.subscription.update({
        where: { id: sub.id },
        data: { nextRenewalAt },
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
  ownerUserId: string;
  ownerEmail: string | null;
  ownerName: string | null;
}

/**
 * リマインダー対象に対して、アプリ内通知(RENEWAL)を作成する。
 * 同一サブスクで直近5日以内の通知があれば重複作成しない。生成件数を返す。
 */
export async function notifyDueRenewals(now: Date = new Date()): Promise<number> {
  const reminders = await dueReminders(now);
  if (reminders.length === 0) return 0;

  // 直近5日の RENEWAL 通知を対象ユーザーぶん一括取得（ループ内 N+1 を回避）。
  const since = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const userIds = [...new Set(reminders.map((r) => r.ownerUserId))];
  const recent = await db.notification.findMany({
    where: { userId: { in: userIds }, type: "RENEWAL", createdAt: { gte: since } },
    select: { userId: true, body: true },
  });
  const bodiesByUser = new Map<string, string[]>();
  for (const n of recent) {
    const arr = bodiesByUser.get(n.userId) ?? [];
    arr.push(n.body);
    bodiesByUser.set(n.userId, arr);
  }

  const toCreate = [];
  for (const r of reminders) {
    const bodies = bodiesByUser.get(r.ownerUserId) ?? [];
    // 同一サブスク名の通知が直近にあれば重複作成しない（同一バッチ内の重複も抑止）。
    if (bodies.some((b) => b.includes(r.name))) continue;
    const body =
      r.daysUntil === 0
        ? `${r.name} は本日更新されます。`
        : `${r.name} はあと${r.daysUntil}日で更新されます。`;
    toCreate.push({
      userId: r.ownerUserId,
      type: "RENEWAL",
      title: "サブスクの更新が近づいています",
      body,
      href: "/subscriptions",
    });
    bodies.push(body);
    bodiesByUser.set(r.ownerUserId, bodies);
  }

  if (toCreate.length > 0) {
    await db.notification.createMany({ data: toCreate });
  }
  return toCreate.length;
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
        ownerUserId: s.ownerUserId,
        ownerEmail: s.owner.email,
        ownerName: s.owner.name,
      });
    }
  }
  return items;
}
