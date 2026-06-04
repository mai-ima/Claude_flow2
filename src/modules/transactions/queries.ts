import "server-only";
import { startOfWeek, subWeeks } from "date-fns";
import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { monthRange } from "@/lib/date";

/** 今週・先週の支出合計（週は月曜始まり）。ベータのインサイト用。 */
export async function weeklyExpenseTotals(ledgerId: string, now: Date = new Date()) {
  const thisStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastStart = subWeeks(thisStart, 1);
  const [thisAgg, lastAgg] = await Promise.all([
    db.transaction.aggregate({
      where: { ledgerId, type: "EXPENSE", occurredAt: { gte: thisStart, lte: now } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { ledgerId, type: "EXPENSE", occurredAt: { gte: lastStart, lt: thisStart } },
      _sum: { amount: true },
    }),
  ]);
  return { thisWeek: thisAgg._sum.amount ?? 0, lastWeek: lastAgg._sum.amount ?? 0 };
}

/**
 * 取引一覧の取得フィールド。UI が使う列のみに絞る（過剰な include を避け、
 * createdBy で User 全体＝passwordHash 等を引かないようにする）。
 */
const txnListSelect = {
  id: true,
  type: true,
  amount: true,
  occurredAt: true,
  memo: true,
  categoryId: true,
  paymentMethodId: true,
  category: { select: { name: true, icon: true } },
  paymentMethod: { select: { name: true } },
  createdBy: { select: { name: true } },
} satisfies Prisma.TransactionSelect;

export async function listTransactions(ledgerId: string, month: Date) {
  const { start, end } = monthRange(month);
  return db.transaction.findMany({
    where: { ledgerId, occurredAt: { gte: start, lte: end } },
    select: txnListSelect,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });
}

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
}

export interface TxnFilter {
  month?: Date | null;
  keyword?: string;
  type?: "INCOME" | "EXPENSE";
  categoryId?: string;
  paymentMethodId?: string;
  page?: number;
  pageSize?: number;
}

/** 絞り込み + ページネーション + 絞り込み合計を返す取引検索。 */
export async function searchTransactions(ledgerId: string, f: TxnFilter) {
  const where: Prisma.TransactionWhereInput = { ledgerId };
  if (f.month) {
    const { start, end } = monthRange(f.month);
    where.occurredAt = { gte: start, lte: end };
  }
  if (f.type) where.type = f.type;
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.paymentMethodId) where.paymentMethodId = f.paymentMethodId;
  if (f.keyword) {
    // メモに加え、カテゴリ名・支払い方法名でも一致（横断検索）。
    where.OR = [
      { memo: { contains: f.keyword, mode: "insensitive" } },
      { category: { name: { contains: f.keyword, mode: "insensitive" } } },
      { paymentMethod: { name: { contains: f.keyword, mode: "insensitive" } } },
    ];
  }

  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20));

  const [items, total, grouped] = await Promise.all([
    db.transaction.findMany({
      where,
      select: txnListSelect,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.transaction.count({ where }),
    db.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
  ]);

  const income = grouped.find((g) => g.type === "INCOME")?._sum.amount ?? 0;
  const expense = grouped.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0;

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    summary: { income, expense, balance: income - expense } as MonthSummary,
  };
}

export async function monthSummary(ledgerId: string, month: Date): Promise<MonthSummary> {
  const { start, end } = monthRange(month);
  const grouped = await db.transaction.groupBy({
    by: ["type"],
    where: { ledgerId, occurredAt: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const income = grouped.find((g) => g.type === "INCOME")?._sum.amount ?? 0;
  const expense = grouped.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0;
  return { income, expense, balance: income - expense };
}

export async function expenseByCategory(ledgerId: string, month: Date) {
  const { start, end } = monthRange(month);
  const rows = await db.transaction.groupBy({
    by: ["categoryId"],
    where: { ledgerId, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const categories = await db.category.findMany({ where: { ledgerId } });
  const map = new Map(categories.map((c) => [c.id, c]));
  return rows
    .map((r) => ({
      categoryId: r.categoryId,
      name: r.categoryId ? (map.get(r.categoryId)?.name ?? "未分類") : "未分類",
      color: r.categoryId ? (map.get(r.categoryId)?.color ?? "gray") : "gray",
      icon: r.categoryId ? (map.get(r.categoryId)?.icon ?? "tag") : "tag",
      amount: r._sum.amount ?? 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** 直近 N ヶ月の収支推移（1クエリで取得し JS で月別集計）。 */
export async function monthlyTrend(ledgerId: string, months: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const buckets = Array.from({ length: months }, (_, idx) => {
    const i = months - 1 - idx;
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { y: d.getFullYear(), m: d.getMonth(), label: `${d.getMonth() + 1}月`, income: 0, expense: 0 };
  });

  const rows = await db.transaction.findMany({
    where: { ledgerId, occurredAt: { gte: start } },
    select: { type: true, amount: true, occurredAt: true },
  });

  for (const t of rows) {
    const b = buckets.find(
      (b) => b.y === t.occurredAt.getFullYear() && b.m === t.occurredAt.getMonth(),
    );
    if (!b) continue;
    if (t.type === "INCOME") b.income += t.amount;
    else b.expense += t.amount;
  }

  return buckets.map((b) => ({ label: b.label, income: b.income, expense: b.expense }));
}

export function listCategories(ledgerId: string) {
  return db.category.findMany({
    where: { ledgerId, isArchived: false },
    orderBy: { createdAt: "asc" },
  });
}

export function listPaymentMethods(ledgerId: string) {
  return db.paymentMethod.findMany({ where: { ledgerId }, orderBy: { createdAt: "asc" } });
}

/** アーカイブ済みも含む全カテゴリ（カテゴリ管理用）。 */
export function listAllCategories(ledgerId: string) {
  return db.category.findMany({ where: { ledgerId }, orderBy: { createdAt: "asc" } });
}

/** 直近の取引（ダッシュボード用）。 */
export function recentTransactions(ledgerId: string, limit = 5) {
  return db.transaction.findMany({
    where: { ledgerId },
    include: { category: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}
