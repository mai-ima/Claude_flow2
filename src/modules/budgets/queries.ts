import "server-only";
import { subMonths } from "date-fns";
import { db } from "@/lib/db";
import { monthRange } from "@/lib/date";

/**
 * 直近 N ヶ月（当月を除く）のカテゴリ別・全体の平均支出を返す（予算の自動提案用）。
 * 「全体」は categoryId=null キーで保持。1ヶ月あたりに按分した整数。
 */
export async function categoryAverages(
  ledgerId: string,
  months = 3,
  now: Date = new Date(),
): Promise<{ byCategory: Record<string, number>; total: number }> {
  const period = Math.max(1, months);
  const start = monthRange(subMonths(now, period)).start; // N ヶ月前の月初
  const end = monthRange(subMonths(now, 1)).end; // 前月末（当月は除外）

  const [byCat, totalAgg] = await Promise.all([
    db.transaction.groupBy({
      by: ["categoryId"],
      where: { ledgerId, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { ledgerId, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ]);

  const byCategory: Record<string, number> = {};
  for (const r of byCat) {
    if (!r.categoryId) continue;
    byCategory[r.categoryId] = Math.round((r._sum.amount ?? 0) / period);
  }
  return { byCategory, total: Math.round((totalAgg._sum.amount ?? 0) / period) };
}

export interface BudgetRow {
  id: string;
  categoryId: string | null;
  isTotalBudget: boolean;
  name: string;
  icon: string;
  color: string;
  amount: number;
  spent: number;
}

/** 予算一覧（全体 + カテゴリ別）に当月の実支出を付与して返す。 */
export async function listBudgetsWithSpending(
  ledgerId: string,
  month: Date = new Date(),
): Promise<{ total: BudgetRow | null; categories: BudgetRow[] }> {
  const { start, end } = monthRange(month);

  const [budgets, categories, expenseByCat, totalExpenseAgg] = await Promise.all([
    // 予算は「継続的な月次予算」で、カテゴリごとに1件だけ持つ設計
    // （/budgets に月切替は無く、常に当月の実績と突き合わせる）。
    // スキーマの startMonth は作成時の記録用で、抽出条件には使わない。
    // 万一同一カテゴリで複数行が存在しても二重表示にならないよう、
    // 新しいものを優先して1件に畳む。
    db.budget.findMany({ where: { ledgerId }, orderBy: { createdAt: "desc" } }),
    db.category.findMany({ where: { ledgerId } }),
    db.transaction.groupBy({
      by: ["categoryId"],
      where: { ledgerId, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { ledgerId, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const spentMap = new Map(expenseByCat.map((r) => [r.categoryId, r._sum.amount ?? 0]));
  const totalSpent = totalExpenseAgg._sum.amount ?? 0;

  let total: BudgetRow | null = null;
  const categoryRows: BudgetRow[] = [];
  const seenCategory = new Set<string>();

  for (const b of budgets) {
    if (b.categoryId) {
      if (seenCategory.has(b.categoryId)) continue;
      seenCategory.add(b.categoryId);
    }
    if (b.isTotalBudget || !b.categoryId) {
      if (total) continue; // 全体予算も1件に畳む
      total = {
        id: b.id,
        categoryId: null,
        isTotalBudget: true,
        name: "全体予算",
        icon: "target",
        color: "blue",
        amount: b.amount,
        spent: totalSpent,
      };
    } else {
      const c = catMap.get(b.categoryId);
      categoryRows.push({
        id: b.id,
        categoryId: b.categoryId,
        isTotalBudget: false,
        name: c?.name ?? "不明なカテゴリ",
        icon: c?.icon ?? "tag",
        color: c?.color ?? "gray",
        amount: b.amount,
        spent: spentMap.get(b.categoryId) ?? 0,
      });
    }
  }

  // 消化率の高い順。amount<=0 はゼロ除算(NaN/Infinity)を避け末尾へ。
  const ratio = (r: BudgetRow) => (r.amount > 0 ? r.spent / r.amount : -1);
  categoryRows.sort((a, b) => ratio(b) - ratio(a));
  return { total, categories: categoryRows };
}
