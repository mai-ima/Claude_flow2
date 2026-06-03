/**
 * ダッシュボードの「今月のアクティビティ」3重リング（Apple フィットネス風）の比率算出。
 * 純関数・client/server 両用。FX 換算は行わない（同一通貨の比率のみ）。
 */
export interface ActivityRingVM {
  key: "expense" | "savings" | "subscription";
  label: string;
  color: string;
  /** リングの値（0–1 超で 100%超表現） */
  value: number;
  /** 凡例に出す金額（分子） */
  amount: number;
}

export function buildActivityRings(
  summary: { income: number; expense: number; balance: number },
  budget: { amount: number; spent: number } | null,
  subMonthly: number,
): { rings: ActivityRingVM[]; show: boolean } {
  const income = summary.income;
  const hasBudget = !!budget && budget.amount > 0;

  // 支出: 予算があれば 支出/予算、無ければ 支出/収入
  const expenseBase = hasBudget ? budget!.amount : income;
  const expenseValue = expenseBase > 0 ? summary.expense / expenseBase : 0;

  // 貯蓄: max(0, 収支) / 収入
  const savings = Math.max(0, summary.balance);
  const savingsValue = income > 0 ? savings / income : 0;

  // サブスク: 月額 / 収入
  const subValue = income > 0 ? subMonthly / income : 0;

  const rings: ActivityRingVM[] = [
    {
      key: "expense",
      label: hasBudget ? "支出 / 予算" : "支出 / 収入",
      color: "var(--color-expense)",
      value: expenseValue,
      amount: summary.expense,
    },
    {
      key: "savings",
      label: "貯蓄 / 収入",
      color: "var(--color-income)",
      value: savingsValue,
      amount: savings,
    },
    {
      key: "subscription",
      label: "サブスク / 収入",
      color: "var(--color-accent)",
      value: subValue,
      amount: subMonthly,
    },
  ];

  // 収入も予算も無ければ意味を持たないので非表示。
  const show = income > 0 || hasBudget;
  return { rings, show };
}
