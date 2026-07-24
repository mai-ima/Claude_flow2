import "server-only";
import { db } from "./db";
import { daysUntil, monthRange } from "./date";
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

/**
 * nextRunAt が到来した繰り返し取引について、取りこぼし分も含め Transaction を
 * 自動生成し、nextRunAt を次サイクルへ進める。生成件数を返す。
 */
export async function processRecurring(now: Date = new Date()): Promise<number> {
  const due = await db.recurringTransaction.findMany({
    where: { active: true, nextRunAt: { lte: now } },
  });

  let created = 0;
  for (const r of due) {
    const { occurrences, nextRenewalAt } = renewalCatchup(
      r.nextRunAt,
      r.cycle as BillingCycle,
      now,
    );
    for (const occurredAt of occurrences) {
      await db.transaction.create({
        data: {
          ledgerId: r.ledgerId,
          createdByUserId: r.createdByUserId,
          type: r.type,
          amount: r.amount,
          currency: r.currency,
          occurredAt,
          categoryId: r.categoryId,
          paymentMethodId: r.paymentMethodId,
          recurringTransactionId: r.id,
          memo: r.memo ? `${r.memo}（定期）` : "定期取引",
        },
      });
      created++;
    }
    if (occurrences.length > 0) {
      await db.recurringTransaction.update({
        where: { id: r.id },
        data: { nextRunAt: nextRenewalAt, lastRunAt: occurrences[occurrences.length - 1] },
      });
    }
  }
  return created;
}

/** nextAutoContributionAt を翌月の同日へ進める（day は <=28 前提でクランプ不要）。 */
function advanceMonthly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, date.getDate(), 0, 0, 0, 0);
}

/**
 * 自動積立が設定された目標について、到来分（取りこぼし含む）の GoalContribution を
 * 作成し currentAmount を加算、nextAutoContributionAt を翌月へ進める。生成件数を返す。
 */
export async function processAutoContributions(now: Date = new Date()): Promise<number> {
  const due = await db.goal.findMany({
    where: {
      autoContributionAmount: { not: null },
      nextAutoContributionAt: { not: null, lte: now },
    },
  });

  let created = 0;
  for (const g of due) {
    const amount = g.autoContributionAmount ?? 0;
    if (amount <= 0 || !g.nextAutoContributionAt) continue;

    let next = g.nextAutoContributionAt;
    let added = 0;
    let guard = 0;
    while (next <= now && guard < 24) {
      await db.goalContribution.create({
        data: { goalId: g.id, amount, occurredAt: next, auto: true, note: "自動積立" },
      });
      added += amount;
      created++;
      next = advanceMonthly(next);
      guard++;
    }
    if (added > 0) {
      await db.goal.update({
        where: { id: g.id },
        data: { currentAmount: g.currentAmount + added, nextAutoContributionAt: next },
      });
    }
  }
  return created;
}

/** 予算超過アラートの閾値（割合・大きい順に判定）。 */
const BUDGET_THRESHOLDS = [1, 0.8] as const;

/**
 * 各帳簿の当月実支出を予算と照合し、80%/100% 到達でアプリ内通知(BUDGET)を
 * 帳簿オーナーへ作成。当月内・同一予算・同一閾値の重複は抑止。生成件数を返す。
 */
export async function notifyBudgetOverages(now: Date = new Date()): Promise<number> {
  const budgets = await db.budget.findMany({
    include: { ledger: { select: { ownerId: true } }, category: { select: { name: true } } },
  });
  if (budgets.length === 0) return 0;

  const { start, end } = monthRange(now);
  const ledgerIds = [...new Set(budgets.map((b) => b.ledgerId))];

  // 当月の支出を帳簿×カテゴリで集計（全体予算用に帳簿合計も）。
  const [byCat, totals, recent] = await Promise.all([
    db.transaction.groupBy({
      by: ["ledgerId", "categoryId"],
      where: { ledgerId: { in: ledgerIds }, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["ledgerId"],
      where: { ledgerId: { in: ledgerIds }, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    db.notification.findMany({
      where: { type: "BUDGET", createdAt: { gte: start } },
      select: { userId: true, href: true },
    }),
  ]);

  const catSpent = new Map<string, number>();
  for (const r of byCat) catSpent.set(`${r.ledgerId}:${r.categoryId ?? ""}`, r._sum.amount ?? 0);
  const totalSpent = new Map<string, number>();
  for (const r of totals) totalSpent.set(r.ledgerId, r._sum.amount ?? 0);
  // 当月内の既存 BUDGET 通知を href の安定キー(予算ID:しきい値)で集合化。
  const keysByUser = new Map<string, Set<string>>();
  for (const n of recent) {
    const set = keysByUser.get(n.userId) ?? new Set<string>();
    if (n.href) set.add(n.href);
    keysByUser.set(n.userId, set);
  }

  const toCreate: { userId: string; ledgerId: string; type: string; title: string; body: string; href: string }[] = [];
  for (const b of budgets) {
    if (b.amount <= 0) continue;
    const label = b.isTotalBudget || !b.categoryId ? "全体予算" : (b.category?.name ?? "カテゴリ予算");
    const spent =
      b.isTotalBudget || !b.categoryId
        ? (totalSpent.get(b.ledgerId) ?? 0)
        : (catSpent.get(`${b.ledgerId}:${b.categoryId}`) ?? 0);
    const ratio = spent / b.amount;
    const hit = BUDGET_THRESHOLDS.find((t) => ratio >= t);
    if (!hit) continue;

    const userId = b.ledger.ownerId;
    const marker = hit === 1 ? "を超えました" : "の80%に達しました";
    const body = `「${label}」が予算${marker}（${Math.round(ratio * 100)}%）。`;
    const href = `/budgets?ref=${b.id}:${hit}`;
    const keys = keysByUser.get(userId) ?? new Set<string>();
    // 同一予算・同一閾値の通知が当月内にあれば重複作成しない。
    if (keys.has(href)) continue;

    toCreate.push({ userId, ledgerId: b.ledgerId, type: "BUDGET", title: "予算アラート", body, href });
    keys.add(href);
    keysByUser.set(userId, keys);
  }

  if (toCreate.length > 0) await db.notification.createMany({ data: toCreate });
  return toCreate.length;
}

/**
 * 無料体験(TRIAL)の終了が reminderDaysBefore 以内のサブスクについて、
 * 終了通知(TRIAL_END)を作成。直近5日の同名通知があれば重複作成しない。
 */
export async function notifyTrialEnds(now: Date = new Date()): Promise<number> {
  const subs = await db.subscription.findMany({
    where: { status: "TRIAL", trialEndsAt: { not: null } },
    include: { owner: { select: { id: true } } },
  });
  if (subs.length === 0) return 0;

  const since = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const ownerIds = [...new Set(subs.map((s) => s.ownerUserId))];
  const recent = await db.notification.findMany({
    where: { userId: { in: ownerIds }, type: "TRIAL_END", createdAt: { gte: since } },
    select: { userId: true, href: true },
  });
  const keysByUser = new Map<string, Set<string>>();
  for (const n of recent) {
    const set = keysByUser.get(n.userId) ?? new Set<string>();
    if (n.href) set.add(n.href);
    keysByUser.set(n.userId, set);
  }

  const toCreate: { userId: string; ledgerId: string; type: string; title: string; body: string; href: string }[] = [];
  for (const s of subs) {
    const d = daysUntil(s.trialEndsAt!, now);
    if (d < 0 || d > s.reminderDaysBefore) continue;
    const href = `/subscriptions?ref=${s.id}`;
    const keys = keysByUser.get(s.ownerUserId) ?? new Set<string>();
    if (keys.has(href)) continue;
    const body =
      d === 0
        ? `${s.name} の無料体験は本日終了します。`
        : `${s.name} の無料体験はあと${d}日で終了します。`;
    toCreate.push({
      userId: s.ownerUserId,
      ledgerId: s.ledgerId,
      type: "TRIAL_END",
      title: "無料体験が終了します",
      body,
      href,
    });
    keys.add(href);
    keysByUser.set(s.ownerUserId, keys);
  }

  if (toCreate.length > 0) await db.notification.createMany({ data: toCreate });
  return toCreate.length;
}

/** 既読の古い通知を保持する日数（これを超えたものは定期削除）。 */
const NOTIFICATION_RETENTION_DAYS = 90;

/**
 * 期限切れ/不要データの定期プルーニング（テーブルの無制限な肥大化を防ぐ基盤処理）。
 * - 期限切れセッションを削除
 * - 既読かつ保持期間を過ぎた通知を削除
 * cron から日次で呼ばれる想定。削除件数を返す。
 */
export async function pruneExpiredData(
  now: Date = new Date(),
): Promise<{ sessions: number; notifications: number }> {
  const notifCutoff = new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const [sessions, notifications] = await Promise.all([
    db.session.deleteMany({ where: { expires: { lt: now } } }),
    db.notification.deleteMany({
      where: { readAt: { not: null }, createdAt: { lt: notifCutoff } },
    }),
  ]);
  return { sessions: sessions.count, notifications: notifications.count };
}

export interface ReminderItem {
  subscriptionId: string;
  ledgerId: string;
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

  // 直近5日の RENEWAL 通知を対象ユーザー分まとめて取得（ループ内 N+1 を回避）。
  // 重複判定は本文の部分一致ではなく、href に埋めた安定キー(subscriptionId)で行う。
  const since = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const userIds = [...new Set(reminders.map((r) => r.ownerUserId))];
  const recent = await db.notification.findMany({
    where: { userId: { in: userIds }, type: "RENEWAL", createdAt: { gte: since } },
    select: { userId: true, href: true },
  });
  const keysByUser = new Map<string, Set<string>>();
  for (const n of recent) {
    const set = keysByUser.get(n.userId) ?? new Set<string>();
    if (n.href) set.add(n.href);
    keysByUser.set(n.userId, set);
  }

  const toCreate = [];
  for (const r of reminders) {
    const href = `/subscriptions?ref=${r.subscriptionId}`;
    const keys = keysByUser.get(r.ownerUserId) ?? new Set<string>();
    // 同一サブスクの通知が直近にあれば重複作成しない（同一バッチ内の重複も抑止）。
    if (keys.has(href)) continue;
    const body =
      r.daysUntil === 0
        ? `${r.name} は本日更新されます。`
        : `${r.name} はあと${r.daysUntil}日で更新されます。`;
    toCreate.push({
      userId: r.ownerUserId,
      ledgerId: r.ledgerId,
      type: "RENEWAL",
      title: "サブスクの更新が近づいています",
      body,
      href,
    });
    keys.add(href);
    keysByUser.set(r.ownerUserId, keys);
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
        ledgerId: s.ledgerId,
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
