import "server-only";
import { db } from "@/lib/db";
import { monthRange } from "@/lib/date";

export async function listTransactions(ledgerId: string, month: Date) {
  const { start, end } = monthRange(month);
  return db.transaction.findMany({
    where: { ledgerId, occurredAt: { gte: start, lte: end } },
    include: { category: true, paymentMethod: true, createdBy: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });
}

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
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

/** 直近 N ヶ月の収支推移。 */
export async function monthlyTrend(ledgerId: string, months: number) {
  const now = new Date();
  const result: { label: string; income: number; expense: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const s = await monthSummary(ledgerId, anchor);
    result.push({
      label: `${anchor.getMonth() + 1}月`,
      income: s.income,
      expense: s.expense,
    });
  }
  return result;
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
