import "server-only";
import { db } from "@/lib/db";
import { currentSessionToken } from "@/lib/auth";
import { describeDevice } from "@/lib/user-agent";

export interface SessionRow {
  id: string;
  device: string;
  ip: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  /** 今見ているブラウザのセッションかどうか。 */
  isCurrent: boolean;
  /** 管理者が閲覧のために発行したセッションか。 */
  isImpersonation: boolean;
}

/**
 * ログイン中の端末一覧。新しく使われたものから並べる。
 * 期限切れは表示しない（利用者から見れば既に切れているため）。
 */
export async function listSessions(userId: string): Promise<SessionRow[]> {
  const [rows, current] = await Promise.all([
    db.session.findMany({
      where: { userId, expires: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
      take: 50,
    }),
    currentSessionToken(),
  ]);

  return rows.map((s) => ({
    id: s.id,
    device: describeDevice(s.userAgent),
    ip: s.ip,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    isCurrent: current !== null && s.sessionToken === current,
    isImpersonation: s.impersonatedBy !== null,
  }));
}

/** 初回案内で見せる進み具合。 */
export interface OnboardingState {
  /** 記録が1件でもあるか。 */
  hasTransaction: boolean;
  /** カテゴリを自分で足したか（初期カテゴリのままではないか）。 */
  hasOwnCategory: boolean;
  /** 予算を1つでも決めたか。 */
  hasBudget: boolean;
  /** 全部済んだか。 */
  done: boolean;
  /** 予算の目安（過去3ヶ月の平均支出）。0 なら出さない。 */
  suggestedBudget: number;
}

/**
 * 初回案内の状態。
 *
 * 「見た／見ていない」ではなく、実際のデータで判定する。
 * チェックを付けただけで進むと、案内どおりに動いたかどうかが分からない。
 */
export async function onboardingState(
  ledgerId: string,
  now: Date = new Date(),
): Promise<OnboardingState> {
  // 直近3ヶ月（当月は含めない。まだ月の途中で、平均を引き下げるため）。
  const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [txnCount, ownCategory, budgetCount, past] = await Promise.all([
    db.transaction.count({ where: { ledgerId } }),
    // 初期カテゴリは帳簿の作成と同時に入る。作成から1分より後に足したものを
    // 「自分で足した」とみなす（作成時刻そのものでは秒のずれで判定がぶれる）。
    db.category.findFirst({
      where: { ledgerId, ledger: { createdAt: { lt: new Date(now) } } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, ledger: { select: { createdAt: true } } },
    }),
    db.budget.count({ where: { ledgerId } }),
    db.transaction.aggregate({
      where: { ledgerId, type: "EXPENSE", occurredAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
  ]);

  const hasOwnCategory =
    !!ownCategory &&
    ownCategory.createdAt.getTime() - ownCategory.ledger.createdAt.getTime() > 60_000;

  const hasTransaction = txnCount > 0;
  const hasBudget = budgetCount > 0;

  return {
    hasTransaction,
    hasOwnCategory,
    hasBudget,
    done: hasTransaction && hasOwnCategory && hasBudget,
    // 3ヶ月ぶんを月あたりに直す。100円単位に丸めて「だいたいの額」に見せる。
    suggestedBudget: Math.round((past._sum.amount ?? 0) / 3 / 100) * 100,
  };
}
