/**
 * カテゴリの親子関係。
 *
 * 階層は1段までに限る。「食費 > 外食」で足り、それ以上深くすると
 * 集計のたびに何段まで畳むかを決めねばならず、画面も選びにくくなる。
 * 深さの制限はここ一箇所で判定し、保存時と表示時の両方から使う。
 */

export interface CategoryNode {
  id: string;
  name: string;
  parentId: string | null;
}

/**
 * その親を指定してよいか。
 *
 * 駄目な場合:
 *   - 自分自身を親にする（無限に辿れる）
 *   - すでに子を持つカテゴリを、別のカテゴリの子にする（2段を超える）
 *   - 子カテゴリを親に指定する（同上）
 */
export function canSetParent(
  categories: CategoryNode[],
  childId: string,
  parentId: string | null,
): { ok: true } | { ok: false; reason: string } {
  if (parentId === null) return { ok: true };
  if (childId === parentId) {
    return { ok: false, reason: "自分自身を親にはできません。" };
  }

  const byId = new Map(categories.map((c) => [c.id, c]));
  const parent = byId.get(parentId);
  if (!parent) return { ok: false, reason: "指定した親カテゴリが見つかりません。" };

  if (parent.parentId !== null) {
    return { ok: false, reason: "サブカテゴリの下にさらに追加することはできません。" };
  }
  const hasChildren = categories.some((c) => c.parentId === childId);
  if (hasChildren) {
    return {
      ok: false,
      reason: "このカテゴリにはサブカテゴリがあるため、他のカテゴリの下には移せません。",
    };
  }
  return { ok: true };
}

export interface Rollup<T> {
  /** 親（または親を持たないカテゴリ）自身。 */
  category: T;
  /** 自分の分と子の分を足した額。 */
  total: number;
  /** 内訳。子が無ければ空。 */
  children: { category: T; amount: number }[];
}

/**
 * 子の金額を親に畳む。
 *
 * 内訳は捨てずに children に残す。合計だけにすると
 * 「食費が増えた」までは分かっても、外食なのか食材なのかが追えない。
 */
export function rollUp<T extends CategoryNode>(
  categories: T[],
  amountOf: (categoryId: string) => number,
): Rollup<T>[] {
  const parents = categories.filter((c) => c.parentId === null);
  const childrenOf = new Map<string, T[]>();
  for (const c of categories) {
    if (c.parentId === null) continue;
    const arr = childrenOf.get(c.parentId) ?? [];
    arr.push(c);
    childrenOf.set(c.parentId, arr);
  }

  return parents
    .map((p) => {
      const children = (childrenOf.get(p.id) ?? [])
        .map((c) => ({ category: c, amount: amountOf(c.id) }))
        .filter((c) => c.amount !== 0)
        .sort((a, b) => b.amount - a.amount);
      const own = amountOf(p.id);
      return {
        category: p,
        total: own + children.reduce((s, c) => s + c.amount, 0),
        children,
      };
    })
    .filter((r) => r.total !== 0 || r.children.length > 0)
    .sort((a, b) => b.total - a.total);
}
