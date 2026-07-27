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
