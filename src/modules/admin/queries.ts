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
