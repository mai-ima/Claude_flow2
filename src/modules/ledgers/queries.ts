import "server-only";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { monthRange } from "@/lib/date";
import type { PlanTier } from "@/lib/enums";
import { fairShares, balances, minimalTransfers, settledAmounts } from "./settlement";

/**
 * 帳簿の人数上限。
 *
 * 判定は必ず「帳簿オーナーの tier」で行う。画面を開いた人の tier を使うと、
 * 同じ帳簿でも FREE のメンバーが見たときだけ上限1人に見える、といった
 * 食い違いが起きる（招待側と表示側で基準が割れていた）。
 */
export async function ledgerMemberLimit(ownerId: string): Promise<number> {
  const billing = await db.billingProfile.findUnique({
    where: { userId: ownerId },
    select: { tier: true },
  });
  return PLANS[(billing?.tier ?? "FREE") as PlanTier].maxMembers;
}

/** 精算画面で見せる1人ぶん。 */
export interface SettlementMemberRow {
  userId: string;
  name: string;
  role: string;
  shareRatio: number;
  /** 負担の割合（%）。表示用。 */
  percent: number;
  /** 本来の負担額。 */
  owed: number;
  /** 実際に払った額（対象月の支出のうち、払った人が自分になっているもの）。 */
  paid: number;
  /** これまでの精算での受け渡し（受け取りがプラス）。 */
  settled: number;
  /** 差引。プラスなら受け取る側。 */
  net: number;
}

export interface SettlementView {
  /** 対象月の支出合計（按分のもとになる額）。 */
  total: number;
  /** 誰が払ったか分かっていない支出。按分はするが、立て替えとしては数えない。 */
  unassigned: number;
  members: SettlementMemberRow[];
  transfers: { fromUserId: string; toUserId: string; amount: number }[];
  records: {
    id: string;
    fromUserId: string | null;
    toUserId: string | null;
    fromName: string;
    toName: string;
    amount: number;
    settledAt: Date;
    memo: string | null;
  }[];
}

/**
 * 対象月の精算。
 *
 * 按分するのはその月の支出だけ。収入まで混ぜると「誰の稼ぎか」の話になり、
 * 立て替えの精算とは別の問題になる。
 *
 * 精算の記録は月で区切らない。先月ぶんを今月渡すことがあるためで、
 * 月で切ると渡したはずの額が差引から消える。
 */
export async function settlementView(
  ledgerId: string,
  month: Date = new Date(),
): Promise<SettlementView> {
  const { start, end } = monthRange(month);

  const [members, expenses, paidGroups, records] = await Promise.all([
    db.ledgerMember.findMany({
      where: { ledgerId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.transaction.aggregate({
      where: { ledgerId, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["paidByUserId"],
      where: { ledgerId, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    db.settlement.findMany({ where: { ledgerId }, orderBy: { settledAt: "desc" }, take: 50 }),
  ]);

  const total = expenses._sum.amount ?? 0;
  const paidBy = new Map<string, number>();
  let unassigned = 0;
  for (const g of paidGroups) {
    if (g.paidByUserId) paidBy.set(g.paidByUserId, g._sum.amount ?? 0);
    else unassigned += g._sum.amount ?? 0;
  }

  const shares = fairShares(
    total,
    members.map((m) => ({ userId: m.userId, shareRatio: m.shareRatio })),
  );
  const rows = balances(shares, paidBy, settledAmounts(records));

  const nameOf = new Map(
    members.map((m) => [m.userId, m.user.name ?? m.user.email ?? "メンバー"] as const),
  );

  return {
    total,
    unassigned,
    members: members.map((m, i) => ({
      userId: m.userId,
      name: nameOf.get(m.userId) ?? "メンバー",
      role: m.role,
      shareRatio: m.shareRatio,
      percent: shares[i]?.percent ?? 0,
      owed: rows[i]?.owed ?? 0,
      paid: rows[i]?.paid ?? 0,
      settled: rows[i]?.settled ?? 0,
      net: rows[i]?.net ?? 0,
    })),
    transfers: minimalTransfers(rows),
    records: records.map((r) => ({
      id: r.id,
      fromUserId: r.fromUserId,
      toUserId: r.toUserId,
      // 退会したメンバーの記録も残る。名前が引けないだけで、金額は差引に効く。
      fromName: (r.fromUserId && nameOf.get(r.fromUserId)) || "退会した方",
      toName: (r.toUserId && nameOf.get(r.toUserId)) || "退会した方",
      amount: r.amount,
      settledAt: r.settledAt,
      memo: r.memo,
    })),
  };
}
