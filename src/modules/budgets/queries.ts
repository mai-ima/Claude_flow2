import "server-only";
import { db } from "@/lib/db";
import { monthRange, addMonthsJST } from "@/lib/date";

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
  const start = monthRange(addMonthsJST(now, -period)).start; // N ヶ月前の月初
  const end = monthRange(addMonthsJST(now, -1)).end; // 前月末（当月は除外）

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
  /** 設定した予算額。 */
  amount: number;
  /** 前月の使い残しから繰り越した額。繰り越しが無ければ 0。 */
  carriedOver: number;
  /** 繰り越しを含めて今月使える額（amount + carriedOver）。 */
  available: number;
  spent: number;
  carryOver: boolean;
}

/** 予算一覧（全体 + カテゴリ別）に当月の実支出を付与して返す。 */
export async function listBudgetsWithSpending(
  ledgerId: string,
  month: Date = new Date(),
): Promise<{ total: BudgetRow | null; categories: BudgetRow[] }> {
  const { start, end } = monthRange(month);

  // 前月の実績。繰り越しの計算に使う。
  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const prevRange = monthRange(prev);

  const [budgets, categories, expenseByCat, totalExpenseAgg, prevByCat, prevTotalAgg] =
    await Promise.all([
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
    db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        ledgerId,
        type: "EXPENSE",
        occurredAt: { gte: prevRange.start, lte: prevRange.end },
      },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: {
        ledgerId,
        type: "EXPENSE",
        occurredAt: { gte: prevRange.start, lte: prevRange.end },
      },
      _sum: { amount: true },
    }),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const totalSpent = totalExpenseAgg._sum.amount ?? 0;

  /**
   * カテゴリの支出。サブカテゴリの分も親に含める。
   *
   * 含めないと、「食費」に予算を立てて「食費 > 外食」で記録した支出が
   * 予算に数えられず、いくら使っても残額が減らない。
   */
  function spentFor(rows: { categoryId: string | null; _sum: { amount: number | null } }[]) {
    const direct = new Map(rows.map((r) => [r.categoryId, r._sum.amount ?? 0]));
    return (categoryId: string) => {
      const own = direct.get(categoryId) ?? 0;
      const children = categories
        .filter((c) => c.parentId === categoryId)
        .reduce((sum, c) => sum + (direct.get(c.id) ?? 0), 0);
      return own + children;
    };
  }

  const spentOf = spentFor(expenseByCat);
  const prevSpentOf = spentFor(prevByCat);
  const prevTotalSpent = prevTotalAgg._sum.amount ?? 0;

  /**
   * 前月の使い残し。使いすぎた月は 0（マイナスは持ち越さない）。
   * 繰り越すのは1か月分だけにする。何か月も積み上げると、
   * 実態と離れた大きな残高になって予算の意味が薄れる。
   */
  const leftover = (amount: number, prevSpent: number) => Math.max(0, amount - prevSpent);

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
      const carriedOver = b.carryOver ? leftover(b.amount, prevTotalSpent) : 0;
      total = {
        id: b.id,
        categoryId: null,
        isTotalBudget: true,
        name: "全体予算",
        icon: "target",
        color: "blue",
        amount: b.amount,
        carriedOver,
        available: b.amount + carriedOver,
        spent: totalSpent,
        carryOver: b.carryOver,
      };
    } else {
      const c = catMap.get(b.categoryId);
      const carriedOver = b.carryOver ? leftover(b.amount, prevSpentOf(b.categoryId)) : 0;
      categoryRows.push({
        id: b.id,
        categoryId: b.categoryId,
        isTotalBudget: false,
        name: c?.name ?? "不明なカテゴリ",
        icon: c?.icon ?? "tag",
        color: c?.color ?? "gray",
        amount: b.amount,
        carriedOver,
        available: b.amount + carriedOver,
        spent: spentOf(b.categoryId),
        carryOver: b.carryOver,
      });
    }
  }

  // 消化率の高い順。繰り越しを含めた「使える額」に対して見る。
  // available<=0 はゼロ除算(NaN/Infinity)を避け末尾へ。
  const ratio = (r: BudgetRow) => (r.available > 0 ? r.spent / r.available : -1);
  categoryRows.sort((a, b) => ratio(b) - ratio(a));
  return { total, categories: categoryRows };
}
