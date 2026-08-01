import "server-only";
import { db } from "./db";
import {
  monthRange,
  daysSince,
  daysUntil,
  dateKeyJST,
  startOfDayJST,
  dayOfWeekJST,
} from "./date";
import { formatMoney, toYearlyAmount } from "./money";
import type { BillingCycle } from "./enums";
import { createNotificationsOnce, type NotificationDraft } from "./notify";
import { detectWaste, WASTE_THRESHOLD_DAYS } from "@/modules/subscriptions/waste-detect";
import { needsReview, REVIEW_INTERVAL_DAYS } from "@/modules/subscriptions/insights";
import { percentDelta, perDayToGoal, unusedEvidence } from "./notify-evidence";

/**
 * 判定ロジックは既に揃っているのに通知が作られていなかった5種類を作る。
 *
 * 方針（設計原則1「説明できること」）:
 * すべての本文に判定の根拠となる数値を書く。「見直しましょう」ではなく
 * 「90日間 利用記録がありません」。何をどう測ってそう言っているのかを
 * 利用者が検算できる状態にする。
 */

/**
 * 長期間使われていないサブスクを知らせる（WASTE）。
 * detectWaste の判定に、経過日数をそのまま添える。
 */
export async function notifyWasteSubscriptions(now: Date = new Date()): Promise<number> {
  const subs = await db.subscription.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] }, ownerUserId: { not: null } },
    select: {
      id: true,
      name: true,
      amount: true,
      currency: true,
      status: true,
      lastUsedAt: true,
      ledgerId: true,
      ownerUserId: true,
    },
  });

  const drafts: NotificationDraft[] = [];
  for (const s of subs) {
    if (detectWaste(s.lastUsedAt, s.status) !== "waste") continue;
    const evidence = unusedEvidence(daysSince(s.lastUsedAt), WASTE_THRESHOLD_DAYS);
    if (!evidence) continue;
    drafts.push({
      userId: s.ownerUserId!,
      ledgerId: s.ledgerId,
      type: "WASTE",
      title: "しばらく使われていないサブスクがあります",
      body: `${s.name}（${formatMoney(s.amount, s.currency)}）は${evidence}。`,
      href: `/subscriptions?ref=${s.id}`,
    });
  }

  // 一度知らせたら、しきい値の期間は蒸し返さない。
  return createNotificationsOnce("WASTE", drafts, WASTE_THRESHOLD_DAYS / 2, now);
}

/**
 * 直近の値上げを知らせる（PRICE_CHANGE）。
 * 金額の前後と変化率を併記する。値下げは通知しない。
 */
export async function notifyPriceChanges(now: Date = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const changes = await db.subscriptionPriceChange.findMany({
    where: { changedAt: { gte: since } },
    include: {
      subscription: {
        select: {
          id: true,
          name: true,
          currency: true,
          ledgerId: true,
          ownerUserId: true,
          status: true,
        },
      },
    },
    orderBy: { changedAt: "desc" },
  });

  const drafts: NotificationDraft[] = [];
  for (const c of changes) {
    const s = c.subscription;
    if (!s?.ownerUserId) continue;
    if (s.status === "CANCELED") continue;
    if (c.newAmount <= c.oldAmount) continue;
    drafts.push({
      userId: s.ownerUserId,
      ledgerId: s.ledgerId,
      type: "PRICE_CHANGE",
      title: "サブスクが値上がりしました",
      body:
        `${s.name} が ${formatMoney(c.oldAmount, s.currency)} → ` +
        `${formatMoney(c.newAmount, s.currency)}（${percentDelta(c.oldAmount, c.newAmount)}）に変わりました。`,
      href: `/subscriptions?ref=${s.id}&change=${c.id}`,
    });
  }

  return createNotificationsOnce("PRICE_CHANGE", drafts, 30, now);
}

/**
 * 週次のふりかえり（SUMMARY）。月曜のみ作成する。
 * 今週と先週の支出額を両方書き、差が何に基づくのか分かるようにする。
 */
export async function notifyWeeklySummary(now: Date = new Date()): Promise<number> {
  // 月曜以外は作らない（毎日届くと通知の意味が薄れる）。
  // 曜日は日本時間で見る。サーバーが UTC だと、日本時間の月曜の朝は
  // まだ日曜と判定され、週のまとめが届かない。
  if (dayOfWeekJST(now) !== 1) return 0;

  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = startOfDayJST(now);
  const thisWeekStart = new Date(startOfToday.getTime() - 7 * dayMs);
  const lastWeekStart = new Date(startOfToday.getTime() - 14 * dayMs);

  const [thisWeek, lastWeek] = await Promise.all([
    db.transaction.groupBy({
      by: ["ledgerId"],
      where: { type: "EXPENSE", occurredAt: { gte: thisWeekStart, lt: startOfToday } },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["ledgerId"],
      where: { type: "EXPENSE", occurredAt: { gte: lastWeekStart, lt: thisWeekStart } },
      _sum: { amount: true },
    }),
  ]);
  if (thisWeek.length === 0) return 0;

  const lastByLedger = new Map(lastWeek.map((r) => [r.ledgerId, r._sum.amount ?? 0]));
  const ledgers = await db.ledger.findMany({
    where: { id: { in: thisWeek.map((r) => r.ledgerId) } },
    select: { id: true, ownerId: true, currency: true },
  });
  const ledgerById = new Map(ledgers.map((l) => [l.id, l]));

  // 重複抑止の鍵。UTC で切ると、日本時間の朝と夜で別の鍵になり、
  // 同じ週のお知らせが2回届く。日本時間の日付で揃える。
  const weekKey = dateKeyJST(startOfToday);
  const drafts: NotificationDraft[] = [];
  for (const row of thisWeek) {
    const ledger = ledgerById.get(row.ledgerId);
    if (!ledger) continue;
    const spent = row._sum.amount ?? 0;
    if (spent <= 0) continue;
    const prev = lastByLedger.get(row.ledgerId) ?? 0;
    const compare =
      prev > 0
        ? `先週は ${formatMoney(prev, ledger.currency)}（${percentDelta(prev, spent)}）。`
        : "先週の支出記録はありません。";
    drafts.push({
      userId: ledger.ownerId,
      ledgerId: ledger.id,
      type: "SUMMARY",
      title: "先週の支出",
      body: `${formatMoney(spent, ledger.currency)} でした。${compare}`,
      href: `/reports?week=${weekKey}`,
    });
  }

  return createNotificationsOnce("SUMMARY", drafts, 6, now);
}

/**
 * 貯金目標の達成・期日接近を知らせる（GOAL）。
 * 「あと◯円」「あと◯日」を必ず数値で書く。
 */
export async function notifyGoals(now: Date = new Date()): Promise<number> {
  const goals = await db.goal.findMany({
    include: { ledger: { select: { ownerId: true, currency: true } } },
  });

  const drafts: NotificationDraft[] = [];
  for (const g of goals) {
    if (g.targetAmount <= 0) continue;
    const currency = g.ledger.currency;
    const reached = g.currentAmount >= g.targetAmount;

    if (reached) {
      drafts.push({
        userId: g.ledger.ownerId,
        ledgerId: g.ledgerId,
        type: "GOAL",
        title: "目標を達成しました",
        body: `${g.name}：目標 ${formatMoney(g.targetAmount, currency)} に到達しました（現在 ${formatMoney(g.currentAmount, currency)}）。`,
        href: `/goals?ref=${g.id}&state=reached`,
      });
      continue;
    }

    if (!g.deadline) continue;
    const left = daysUntil(g.deadline, now);
    // 期日30日前から、届いていないものだけ知らせる。
    if (left < 0 || left > 30) continue;
    const remaining = g.targetAmount - g.currentAmount;
    const perDay = perDayToGoal(remaining, left);
    drafts.push({
      userId: g.ledger.ownerId,
      ledgerId: g.ledgerId,
      type: "GOAL",
      title: "目標の期日が近づいています",
      body:
        `${g.name}：あと ${formatMoney(remaining, currency)}、残り${left}日。` +
        `1日あたり ${formatMoney(perDay, currency)} で届きます。`,
      href: `/goals?ref=${g.id}&state=deadline`,
    });
  }

  return createNotificationsOnce("GOAL", drafts, 14, now);
}

/**
 * 当月に自動記帳された定期取引をまとめて知らせる（RECURRING）。
 * 「勝手に記録が増えた」と見えないよう、件数と合計を書く。
 */
export async function notifyRecurringPosted(now: Date = new Date()): Promise<number> {
  const dayMs = 24 * 60 * 60 * 1000;
  const since = new Date(now.getTime() - dayMs);
  const posted = await db.transaction.groupBy({
    by: ["ledgerId"],
    where: { recurringTransactionId: { not: null }, createdAt: { gte: since } },
    _sum: { amount: true },
    _count: { _all: true },
  });
  if (posted.length === 0) return 0;

  const ledgers = await db.ledger.findMany({
    where: { id: { in: posted.map((p) => p.ledgerId) } },
    select: { id: true, ownerId: true, currency: true },
  });
  const ledgerById = new Map(ledgers.map((l) => [l.id, l]));

  const dayKey = dateKeyJST(now);

  const drafts: NotificationDraft[] = [];
  for (const p of posted) {
    const ledger = ledgerById.get(p.ledgerId);
    if (!ledger) continue;
    const count = p._count._all;
    const total = p._sum.amount ?? 0;
    drafts.push({
      userId: ledger.ownerId,
      ledgerId: ledger.id,
      type: "RECURRING",
      title: "定期取引を記録しました",
      body: `${count}件・合計 ${formatMoney(total, ledger.currency)} を自動で記録しました。`,
      href: `/transactions?posted=${dayKey}`,
    });
  }

  return createNotificationsOnce("RECURRING", drafts, 1, now);
}

/**
 * 棚卸しを促す（REVIEW）。
 *
 * 判定は「最後に見直してから REVIEW_INTERVAL_DAYS 日たったか」だけ。
 * 使用状況の推測はしない（C1）。件数と年額を書き、なぜ今なのかを示す。
 *
 * 帳簿ごとに1通にまとめる。1件ずつ送ると、サブスクが多い人ほど
 * 通知で埋まって読まれなくなる。
 */
export async function notifySubscriptionReview(now: Date = new Date()): Promise<number> {
  const subs = await db.subscription.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] }, ownerUserId: { not: null } },
    select: {
      id: true,
      name: true,
      amount: true,
      cycle: true,
      currency: true,
      ledgerId: true,
      ownerUserId: true,
      lastReviewedAt: true,
    },
  });

  // 帳簿ごとに、見直し時期が来ているものを集める。
  const byLedger = new Map<
    string,
    { userId: string; ledgerId: string; currency: string; names: string[]; yearly: number }
  >();
  for (const s of subs) {
    if (!needsReview(s.lastReviewedAt, now)) continue;
    const g = byLedger.get(s.ledgerId) ?? {
      userId: s.ownerUserId!,
      ledgerId: s.ledgerId,
      currency: s.currency,
      names: [],
      yearly: 0,
    };
    g.names.push(s.name);
    g.yearly += toYearlyAmount(s.amount, s.cycle as BillingCycle);
    byLedger.set(s.ledgerId, g);
  }

  const drafts: NotificationDraft[] = [];
  for (const g of byLedger.values()) {
    // 名前を全部並べると本文が長くなる。先頭3件と残数にする。
    const head = g.names.slice(0, 3).join("、");
    const rest = g.names.length > 3 ? ` ほか${g.names.length - 3}件` : "";
    drafts.push({
      userId: g.userId,
      ledgerId: g.ledgerId,
      type: "REVIEW",
      title: "サブスクの見直し時期です",
      body:
        `${g.names.length}件が、最後の見直しから${REVIEW_INTERVAL_DAYS}日以上たっています` +
        `（${head}${rest}）。合計は年 ${formatMoney(g.yearly, g.currency)} です。`,
      href: "/subscriptions?review=1",
    });
  }

  // 知らせるのは棚卸しの間隔と同じ周期で十分。毎日蒸し返さない。
  return createNotificationsOnce("REVIEW", drafts, REVIEW_INTERVAL_DAYS, now);
}

/** 当月の実支出（予算タブ等と同じ範囲）。将来の通知で使う共通部品。 */
export async function monthExpense(ledgerId: string, now: Date = new Date()): Promise<number> {
  const { start, end } = monthRange(now);
  const agg = await db.transaction.aggregate({
    where: { ledgerId, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}
