import "server-only";
import { rollUp } from "@/lib/category-tree";
import { startOfWeek, subWeeks } from "date-fns";
import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { monthRange, toDateInput } from "@/lib/date";

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
  // 退会したメンバーの記録は createdByUserId が null になる。
  // 名前未設定の在籍メンバーと区別するため、ID も併せて取る。
  createdByUserId: true,
  createdBy: { select: { name: true } },
  // 実際に払った人。共有帳簿の精算と、一覧での表示に使う。
  paidByUserId: true,
  paidBy: { select: { name: true } },
  tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
  attachments: { select: { id: true, url: true, name: true, mimeType: true, size: true } },
} satisfies Prisma.TransactionSelect;

/** 1ヶ月分として送る取引の上限（RSC ペイロードの肥大化を防ぐ）。 */
export const MONTH_TXN_LIMIT = 400;

export async function listTransactions(ledgerId: string, month: Date) {
  const { start, end } = monthRange(month);
  return db.transaction.findMany({
    where: { ledgerId, occurredAt: { gte: start, lte: end } },
    select: txnListSelect,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: MONTH_TXN_LIMIT,
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
  /** タグ。貼ってあるものだけに絞る。 */
  tagId?: string;
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
  if (f.tagId) where.tags = { some: { tagId: f.tagId } };
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

/** カテゴリ別の内訳（種別を指定）。円グラフ・内訳リスト用。 */
async function categoryBreakdown(
  ledgerId: string,
  month: Date,
  type: "INCOME" | "EXPENSE",
) {
  const { start, end } = monthRange(month);
  const rows = await db.transaction.groupBy({
    by: ["categoryId"],
    where: { ledgerId, type, occurredAt: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const categories = await db.category.findMany({ where: { ledgerId } });
  const amount = new Map(rows.map((r) => [r.categoryId, r._sum.amount ?? 0]));
  const amountOf = (id: string) => amount.get(id) ?? 0;

  // 子の額は親に畳んで出す。「食費」と「食費 > 外食」が並ぶと、
  // どちらが全体なのか読み取れない。内訳は children に残す。
  const rolled = rollUp(categories, amountOf).map((r) => ({
    categoryId: r.category.id as string | null,
    name: r.category.name,
    color: r.category.color,
    icon: r.category.icon,
    amount: r.total,
    children: r.children.map((c) => ({
      categoryId: c.category.id,
      name: c.category.name,
      color: c.category.color,
      icon: c.category.icon,
      amount: c.amount,
    })),
  }));

  // カテゴリの無い取引。畳む相手がいないので最後に足す。
  const uncategorized = amount.get(null) ?? 0;
  if (uncategorized !== 0) {
    rolled.push({
      categoryId: null,
      name: "未分類",
      color: "gray",
      icon: "tag",
      amount: uncategorized,
      children: [],
    });
  }
  return rolled.sort((a, b) => b.amount - a.amount);
}

export function expenseByCategory(ledgerId: string, month: Date) {
  return categoryBreakdown(ledgerId, month, "EXPENSE");
}

export function incomeByCategory(ledgerId: string, month: Date) {
  return categoryBreakdown(ledgerId, month, "INCOME");
}

export interface DayTotal {
  /** yyyy-MM-dd（ローカル日付） */
  date: string;
  income: number;
  expense: number;
  count: number;
}

/**
 * 当月の日別収支。カレンダー表示用に 1 クエリで取得し JS で日別集計する
 * （occurredAt は時刻を持つため DB の groupBy では日単位にまとまらない）。
 */
export async function dailyTotals(ledgerId: string, month: Date): Promise<DayTotal[]> {
  const { start, end } = monthRange(month);
  const rows = await db.transaction.findMany({
    where: { ledgerId, occurredAt: { gte: start, lte: end } },
    select: { type: true, amount: true, occurredAt: true },
  });
  return bucketByDay(rows);
}

/** 取引の配列を日別に畳む。dailyTotals とカレンダーの取得で共用する。 */
function bucketByDay(
  rows: { type: string; amount: number; occurredAt: Date }[],
): DayTotal[] {
  const map = new Map<string, DayTotal>();
  for (const t of rows) {
    const key = toDateInput(t.occurredAt);
    const bucket = map.get(key) ?? { date: key, income: 0, expense: 0, count: 0 };
    if (t.type === "INCOME") bucket.income += t.amount;
    else bucket.expense += t.amount;
    bucket.count++;
    map.set(key, bucket);
  }
  return [...map.values()];
}

/**
 * カレンダー表示に要るものを1回のクエリでまとめて取る。
 *
 * 以前は dailyTotals と listTransactions を並べて呼んでおり、同じ月の
 * 取引を2回引いていた。しかも listTransactions は 400件で打ち切るため、
 * 取引の多い月では日別の集計まで欠けていた（カレンダーの数字が実際より
 * 小さくなる）。
 *
 * 日別の集計は全件から作り、明細のほうだけ上限をかける。
 */
export async function calendarMonth(ledgerId: string, month: Date) {
  const { start, end } = monthRange(month);
  const rows = await db.transaction.findMany({
    where: { ledgerId, occurredAt: { gte: start, lte: end } },
    select: txnListSelect,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  return {
    // 集計は全件から。ここを打ち切ると月の合計が合わなくなる。
    days: bucketByDay(rows),
    // 画面に並べるぶんだけ。送る量を抑える。
    items: rows.slice(0, MONTH_TXN_LIMIT),
    /** 上限で切り落とした件数。0 より大きければ画面で断る。 */
    omitted: Math.max(0, rows.length - MONTH_TXN_LIMIT),
  };
}

/**
 * 指定年の月次収支（1〜12月）。monthlyTrend は「今日から遡る N ヶ月」で
 * ラベルに年を持たないため、年単位の集計にはこちらを使う。
 */
export async function yearlyTrend(ledgerId: string, year: number) {
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  const buckets = Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}月`,
    income: 0,
    expense: 0,
  }));

  const rows = await db.transaction.findMany({
    where: { ledgerId, occurredAt: { gte: start, lte: end } },
    select: { type: true, amount: true, occurredAt: true },
  });

  for (const t of rows) {
    const b = buckets[t.occurredAt.getMonth()];
    if (!b) continue;
    if (t.type === "INCOME") b.income += t.amount;
    else b.expense += t.amount;
  }
  return buckets;
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

/** 繰り返し（定期）取引の一覧。カテゴリ/支払い名を付与。 */
export function listRecurring(ledgerId: string) {
  return db.recurringTransaction.findMany({
    where: { ledgerId },
    select: {
      id: true,
      type: true,
      amount: true,
      cycle: true,
      nextRunAt: true,
      lastRunAt: true,
      active: true,
      memo: true,
      categoryId: true,
      paymentMethodId: true,
      category: { select: { name: true, icon: true } },
      paymentMethod: { select: { name: true } },
    },
    orderBy: [{ active: "desc" }, { nextRunAt: "asc" }],
  });
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

/**
 * 保存した検索（自分のぶんだけ）。
 * 共有帳簿で他の人の検索まで並ぶと、自分のものを探すのに時間がかかる。
 */
export function listSavedSearches(ledgerId: string, userId: string) {
  return db.savedSearch.findMany({
    where: { ledgerId, userId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
}

/** タグ一覧（付いている件数つき）。 */
export async function listTags(ledgerId: string) {
  const rows = await db.tag.findMany({
    where: { ledgerId },
    include: { _count: { select: { transactions: true } } },
    orderBy: { name: "asc" },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    count: t._count.transactions,
  }));
}

/**
 * 資産の推移（古い順）。
 *
 * 口座の自動連携はしないため、ここに並ぶのは手で書き留めた額だけ。
 * 前月との差も一緒に返す（増えたか減ったかを画面で計算し直さずに済む）。
 */
export async function assetHistory(ledgerId: string, limit = 24) {
  const rows = await db.assetSnapshot.findMany({
    where: { ledgerId },
    orderBy: { month: "desc" },
    take: limit,
  });
  const asc = [...rows].reverse();
  return asc.map((r, i) => ({
    id: r.id,
    month: r.month,
    amount: r.amount,
    memo: r.memo,
    /** 前月からの増減。前月の記録が無ければ null。 */
    diff: i > 0 ? r.amount - asc[i - 1].amount : null,
  }));
}

/**
 * 対象月の記録の付き方（件数と、記録があった日数）。
 * 健康度スコアの「記録の続き方」に使う。1回のクエリで両方出す。
 *
 * 進行中の月では「今日まで」で数える。先の日付の記録（旅行の予定など）を
 * 数えてしまうと、まだ来ていない日のぶんで日数が水増しされ、
 * 「1日のうち6日に記録があります」のような文が出る（実際に出た）。
 */
export async function recordingActivity(
  ledgerId: string,
  month: Date,
  now: Date = new Date(),
): Promise<{ count: number; recordedDays: number; elapsedDays: number }> {
  const { start, end } = monthRange(month);
  // 進行中の月なら今日の終わりまで。過ぎた月・先の月はその月いっぱい。
  const until = now < end && now > start ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999) : end;
  const rows = await db.transaction.findMany({
    where: { ledgerId, occurredAt: { gte: start, lte: until } },
    select: { occurredAt: true },
  });
  return {
    count: rows.length,
    recordedDays: new Set(rows.map((r) => toDateInput(r.occurredAt))).size,
    // 分母。ここまでで何日ぶんが対象かを、数える側と揃えて返す。
    elapsedDays: until.getDate(),
  };
}

/**
 * 月初から指定時点までの支出。
 *
 * 着地予測に使う。月全体の支出を経過日数で割ると、先の日付で入れた記録
 * （旅行の予定など）まで分子に入り、経過日数で割った瞬間に実態と
 * かけ離れた数字になる。分子と分母の期間を揃えるために要る。
 */
export async function expenseSoFar(
  ledgerId: string,
  month: Date,
  now: Date = new Date(),
): Promise<number> {
  const { start, end } = monthRange(month);
  const until =
    now > start && now < end
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      : end;
  const agg = await db.transaction.aggregate({
    where: { ledgerId, type: "EXPENSE", occurredAt: { gte: start, lte: until } },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}
