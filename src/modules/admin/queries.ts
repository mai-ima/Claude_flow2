import "server-only";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import type { PlanTier } from "@/lib/enums";
import { effectiveAdminRole, type AdminRole } from "@/lib/admin-role";

export interface AdminStats {
  users: number;
  newUsers7d: number;
  ledgers: number;
  transactions: number;
  subscriptions: number;
  goals: number;
  tierCounts: Record<PlanTier, number>;
  mrr: number;
}

/** アプリ全体の集計（管理者専用・帳簿スコープを跨ぐ）。 */
export async function adminStats(): Promise<AdminStats> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [users, newUsers7d, ledgers, transactions, subscriptions, goals, tiers] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: weekAgo } } }),
      db.ledger.count(),
      db.transaction.count(),
      db.subscription.count(),
      db.goal.count(),
      db.billingProfile.groupBy({ by: ["tier"], _count: { tier: true } }),
    ]);

  const tierCounts: Record<PlanTier, number> = { FREE: 0, PLUS: 0, PRO: 0 };
  for (const t of tiers) {
    const tier = t.tier as PlanTier;
    if (tier in tierCounts) tierCounts[tier] = t._count.tier;
  }
  // 課金プロフィール未作成ユーザーは FREE 扱い
  const withProfile = tierCounts.FREE + tierCounts.PLUS + tierCounts.PRO;
  tierCounts.FREE += Math.max(0, users - withProfile);

  const mrr = tierCounts.PLUS * PLANS.PLUS.monthly + tierCounts.PRO * PLANS.PRO.monthly;

  return { users, newUsers7d, ledgers, transactions, subscriptions, goals, tierCounts, mrr };
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  name: string | null;
  isAdmin: boolean;
  adminRole: AdminRole;
  tier: PlanTier;
  ledgers: number;
  createdAt: Date;
}

/** 登録ユーザーの総数（一覧の取得上限とは別に、実数を表示するため）。 */
export async function countUsers(): Promise<number> {
  return db.user.count();
}

/** ユーザー一覧（新しい順）。上限あり。 */
export async function listUsers(limit = 100): Promise<AdminUserRow[]> {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      billing: true,
      _count: { select: { memberships: true } },
    },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    isAdmin: u.isAdmin,
    adminRole: effectiveAdminRole(u.adminRole, u.isAdmin),
    tier: (u.billing?.tier ?? "FREE") as PlanTier,
    ledgers: u._count.memberships,
    createdAt: u.createdAt,
  }));
}

export interface AuditLogRow {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetLabel: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: Date;
}

/**
 * 監査ログ一覧。アクター・対象・期間で絞り込む。
 * 件数が伸びる一方のテーブルなので、必ず上限を切って返す。
 */
export async function listAuditLogs(opts: {
  actorEmail?: string;
  action?: string;
  targetId?: string;
  limit?: number;
} = {}): Promise<AuditLogRow[]> {
  const limit = Math.min(opts.limit ?? 100, 200);
  return db.auditLog.findMany({
    where: {
      ...(opts.actorEmail ? { actorEmail: { contains: opts.actorEmail, mode: "insensitive" } } : {}),
      ...(opts.action ? { action: opts.action } : {}),
      ...(opts.targetId ? { targetId: opts.targetId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** 監査ログに実際に現れた操作種別（絞り込みの選択肢用）。 */
export async function auditActions(): Promise<string[]> {
  const rows = await db.auditLog.groupBy({ by: ["action"], orderBy: { action: "asc" } });
  return rows.map((r) => r.action);
}

// ── 運用の可視化 ────────────────────────────

export async function listCronRuns(limit = 30) {
  return db.cronRun.findMany({ orderBy: { startedAt: "desc" }, take: limit });
}

/** 直近の失敗。管理画面の先頭で警告を出すために使う。 */
export async function recentCronFailures(hours = 48) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return db.cronRun.count({ where: { status: "FAILED", startedAt: { gte: since } } });
}

export async function listEmailLogs(opts: { kind?: string; status?: string; limit?: number } = {}) {
  return db.emailLog.findMany({
    where: {
      ...(opts.kind ? { kind: opts.kind } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.limit ?? 50, 200),
  });
}

export async function listErrorEvents(limit = 50) {
  return db.errorEvent.findMany({ orderBy: { lastSeen: "desc" }, take: limit });
}

/**
 * テーブルごとの行数と直近30日の増加。
 * 肥大化に事前に気づくための数字なので、重い集計はしない（count のみ）。
 */
export async function dataVolume() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [
    users, ledgers, transactions, subscriptions, notifications, sessions,
    recurring, goals, budgets, auditLogs, emailLogs, errorEvents, cronRuns,
    newUsers, newTransactions, newNotifications,
  ] = await Promise.all([
    db.user.count(), db.ledger.count(), db.transaction.count(), db.subscription.count(),
    db.notification.count(), db.session.count(), db.recurringTransaction.count(),
    db.goal.count(), db.budget.count(), db.auditLog.count(), db.emailLog.count(),
    db.errorEvent.count(), db.cronRun.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.transaction.count({ where: { createdAt: { gte: since } } }),
    db.notification.count({ where: { createdAt: { gte: since } } }),
  ]);
  return {
    rows: [
      { name: "ユーザー", total: users, added: newUsers },
      { name: "帳簿", total: ledgers, added: null },
      { name: "取引", total: transactions, added: newTransactions },
      { name: "サブスク", total: subscriptions, added: null },
      { name: "定期取引", total: recurring, added: null },
      { name: "目標", total: goals, added: null },
      { name: "予算", total: budgets, added: null },
      { name: "通知", total: notifications, added: newNotifications },
      { name: "セッション", total: sessions, added: null },
      { name: "監査ログ", total: auditLogs, added: null },
      { name: "メール送信ログ", total: emailLogs, added: null },
      { name: "エラー", total: errorEvents, added: null },
      { name: "バッチ実行", total: cronRuns, added: null },
    ],
  };
}

// ── ユーザー運用 ────────────────────────────

export interface UserSearchOptions {
  q?: string;
  tier?: string;
  adminOnly?: boolean;
  suspendedOnly?: boolean;
  /** 前ページ最後の createdAt。これより古いものを次ページとして返す。 */
  cursor?: string;
  limit?: number;
}

/**
 * ユーザー検索。
 *
 * 以前は先頭200件の固定取得で、201人目以降は永久に画面へ出てこなかった。
 * offset ではなく createdAt のカーソルで送る（件数が増えても後ろのページが
 * 重くならず、ページ送り中に登録があっても行が重複しない）。
 */
export async function searchUsers(opts: UserSearchOptions = {}) {
  const limit = Math.min(opts.limit ?? 50, 100);
  const q = opts.q?.trim();
  const rows = await db.user.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(opts.adminOnly ? { adminRole: { not: "NONE" } } : {}),
      ...(opts.suspendedOnly ? { suspendedAt: { not: null } } : {}),
      ...(opts.tier ? { billing: { tier: opts.tier } } : {}),
      ...(opts.cursor ? { createdAt: { lt: new Date(opts.cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    // 次ページの有無を知るために1件多く取る。
    take: limit + 1,
    include: { billing: true, _count: { select: { memberships: true } } },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    users: page.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isAdmin: u.isAdmin,
      adminRole: effectiveAdminRole(u.adminRole, u.isAdmin),
      suspendedAt: u.suspendedAt,
      tier: (u.billing?.tier ?? "FREE") as PlanTier,
      ledgers: u._count.memberships,
      createdAt: u.createdAt,
    })),
    nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
  };
}

/** ユーザー詳細。所属帳簿・件数・通知・ログイン端末・自分に関する監査ログ。 */
export async function userDetail(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      billing: true,
      memberships: {
        include: { ledger: { select: { id: true, name: true, type: true, ownerId: true } } },
      },
      sessions: {
        orderBy: { lastUsedAt: "desc" },
        take: 10,
        select: { id: true, ip: true, userAgent: true, createdAt: true, lastUsedAt: true, impersonatedBy: true },
      },
      notifications: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!user) return null;

  const ledgerIds = user.memberships.map((m) => m.ledgerId);
  const [txns, subs, audits] = await Promise.all([
    db.transaction.count({ where: { ledgerId: { in: ledgerIds } } }),
    db.subscription.count({ where: { ownerUserId: userId } }),
    db.auditLog.findMany({
      where: { targetId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { user, counts: { transactions: txns, subscriptions: subs }, audits };
}

// ── 分析 ────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * アクティブユーザー数。
 *
 * 「アクティブ」の定義は Session.lastUsedAt を基準にする。
 * 取引の作成日だと、見に来ただけの人が数に入らず実態より小さく出る。
 */
export async function activeUsers(now: Date = new Date()) {
  const [dau, wau, mau] = await Promise.all([
    db.session.findMany({
      where: { lastUsedAt: { gte: new Date(now.getTime() - DAY_MS) } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    db.session.findMany({
      where: { lastUsedAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    db.session.findMany({
      where: { lastUsedAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);
  return { dau: dau.length, wau: wau.length, mau: mau.length };
}

/** 日ごとの新規登録数（既定30日）。 */
export async function signupTrend(days = 30, now: Date = new Date()) {
  const since = new Date(now.getTime() - days * DAY_MS);
  const users = await db.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const counts = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    counts.set(dayKey(new Date(now.getTime() - (days - 1 - i) * DAY_MS)), 0);
  }
  for (const u of users) {
    const k = dayKey(u.createdAt);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts].map(([date, count]) => ({ date, count }));
}

/**
 * 登録週ごとの継続率コホート。
 * 登録から 1日後 / 7日後 / 30日後 に、セッションを使った形跡があるかで数える。
 */
export async function retentionCohorts(weeks = 6, now: Date = new Date()) {
  const since = new Date(now.getTime() - weeks * 7 * DAY_MS);
  const users = await db.user.findMany({
    where: { createdAt: { gte: since } },
    select: { id: true, createdAt: true, sessions: { select: { lastUsedAt: true } } },
  });

  const buckets = new Map<string, { total: number; d1: number; d7: number; d30: number }>();
  for (const u of users) {
    // 週の始まり（日曜）でまとめる。
    const start = new Date(u.createdAt);
    start.setDate(start.getDate() - start.getDay());
    const key = dayKey(start);
    const b = buckets.get(key) ?? { total: 0, d1: 0, d7: 0, d30: 0 };
    b.total++;
    const last = u.sessions.reduce<Date | null>(
      (acc, s) => (acc === null || s.lastUsedAt > acc ? s.lastUsedAt : acc),
      null,
    );
    if (last) {
      const alive = last.getTime() - u.createdAt.getTime();
      if (alive >= DAY_MS) b.d1++;
      if (alive >= 7 * DAY_MS) b.d7++;
      if (alive >= 30 * DAY_MS) b.d30++;
    }
    buckets.set(key, b);
  }
  return [...buckets]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([week, v]) => ({ week, ...v }));
}

/** 機能ごとの利用率。プラン設計とロードマップの根拠にする。 */
export async function featureUsage() {
  const [
    total, withBudget, withGoal, withRecurring, withSubscription, withTransaction, betaOn,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { memberships: { some: { ledger: { budgets: { some: {} } } } } } }),
    db.user.count({ where: { memberships: { some: { ledger: { goals: { some: {} } } } } } }),
    db.user.count({
      where: { memberships: { some: { ledger: { recurringTransactions: { some: {} } } } } },
    }),
    db.user.count({ where: { ownedSubs: { some: {} } } }),
    db.user.count({ where: { createdTxns: { some: {} } } }),
    db.user.count({ where: { betaOptIn: true } }),
  ]);
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);
  return {
    total,
    rows: [
      { name: "取引を記録している", count: withTransaction, pct: pct(withTransaction) },
      { name: "予算を設定している", count: withBudget, pct: pct(withBudget) },
      { name: "目標を持っている", count: withGoal, pct: pct(withGoal) },
      { name: "定期取引を登録している", count: withRecurring, pct: pct(withRecurring) },
      { name: "サブスクを登録している", count: withSubscription, pct: pct(withSubscription) },
      { name: "ベータ機能を有効にしている", count: betaOn, pct: pct(betaOn) },
    ],
  };
}

/** 収益。MRR/ARR/ARPU と、解約予告中の件数。 */
export async function revenueStats() {
  const [plus, pro, cancelling, total] = await Promise.all([
    db.billingProfile.count({ where: { tier: "PLUS" } }),
    db.billingProfile.count({ where: { tier: "PRO" } }),
    db.billingProfile.count({ where: { cancelAtPeriodEnd: true } }),
    db.user.count(),
  ]);
  // 価格の二重管理を避け、プラン定義から取る。
  const mrr = plus * PLANS.PLUS.monthly + pro * PLANS.PRO.monthly;
  return {
    plus,
    pro,
    free: Math.max(0, total - plus - pro),
    cancelling,
    mrr,
    arr: mrr * 12,
    arpu: total === 0 ? 0 : Math.round(mrr / total),
    payingRatio: total === 0 ? 0 : Math.round(((plus + pro) / total) * 1000) / 10,
  };
}

/** 帳簿あたりの取引数の分布と、共有帳簿の割合。 */
export async function contentStats() {
  const [ledgers, pods, byLedger, memberCounts] = await Promise.all([
    db.ledger.count(),
    db.ledger.count({ where: { type: "POD" } }),
    db.transaction.groupBy({ by: ["ledgerId"], _count: { _all: true } }),
    db.ledgerMember.groupBy({ by: ["ledgerId"], _count: { _all: true } }),
  ]);

  const bands = [
    { name: "0件", min: 0, max: 0, count: 0 },
    { name: "1〜9件", min: 1, max: 9, count: 0 },
    { name: "10〜49件", min: 10, max: 49, count: 0 },
    { name: "50〜199件", min: 50, max: 199, count: 0 },
    { name: "200件以上", min: 200, max: Infinity, count: 0 },
  ];
  const counted = new Map(byLedger.map((r) => [r.ledgerId, r._count._all]));
  // 取引が1件も無い帳簿は groupBy に出てこないため、総数から補う。
  let withNone = ledgers - counted.size;
  for (const n of counted.values()) {
    const band = bands.find((b) => n >= b.min && n <= b.max);
    if (band) band.count++;
  }
  bands[0].count += Math.max(0, withNone);
  withNone = 0;

  const memberBands = new Map<number, number>();
  for (const m of memberCounts) {
    memberBands.set(m._count._all, (memberBands.get(m._count._all) ?? 0) + 1);
  }

  return {
    ledgers,
    pods,
    podRatio: ledgers === 0 ? 0 : Math.round((pods / ledgers) * 1000) / 10,
    bands,
    memberDistribution: [...memberBands]
      .sort((a, b) => a[0] - b[0])
      .map(([members, count]) => ({ members, count })),
  };
}
