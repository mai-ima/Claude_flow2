import type { Metadata } from "next";
import { getAppContext, resolveMonth, monthParam } from "@/lib/app-context";
import {
  searchTransactions,
  calendarMonth,
  listAllCategories,
  listPaymentMethods,
  listSavedSearches,
  listTags,
} from "@/modules/transactions/queries";
import {
  TransactionsClient,
  type TxnListItem,
  TransactionFilters,
  Pagination,
  ViewSwitcher,
  CalendarClient,
} from "@/modules/transactions";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { MonthSwitcher } from "@/components/app/month-switcher";
import { ButtonLink } from "@/components/ui/button";
import { RepeatIcon } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatDate, todayLocal } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";
import { isAttachmentEnabled } from "@/lib/env";

export const metadata: Metadata = pageMetadata({ title: "家計簿", noindex: true });

type SP = {
  m?: string;
  q?: string;
  type?: string;
  cat?: string;
  pm?: string;
  tag?: string;
  page?: string;
  view?: string;
};

/**
 * Transaction 行 → クライアント表示用の項目へ変換。
 *
 * 編集できるかどうかは行ごとに決まる（SELF_EDITOR は自分の記録だけ）。
 * 判定はサーバーで済ませ、クライアントには結果だけ渡す。
 */
function toListItem(
  t: {
    id: string;
    type: string;
    amount: number;
    occurredAt: Date;
    memo: string | null;
    categoryId: string | null;
    paymentMethodId: string | null;
    category: { name: string; icon: string } | null;
    paymentMethod: { name: string } | null;
    createdByUserId: string | null;
    createdBy: { name: string | null } | null;
    paidByUserId: string | null;
    paidBy: { name: string | null } | null;
    tags: { tag: { id: string; name: string; color: string } }[];
    attachments: { id: string; url: string; name: string; mimeType: string; size: number }[];
  },
  perm: { canEditOthers: boolean; userId: string },
): TxnListItem {
  return {
    id: t.id,
    type: t.type as "INCOME" | "EXPENSE",
    amount: t.amount,
    occurredAt: t.occurredAt.toISOString(),
    dateLabel: formatDate(t.occurredAt, "M月d日(E)"),
    memo: t.memo,
    categoryId: t.categoryId,
    categoryName: t.category?.name ?? "未分類",
    categoryIcon: t.category?.icon ?? "tag",
    paymentMethodId: t.paymentMethodId,
    paymentName: t.paymentMethod?.name ?? null,
    // 記録者が退会すると createdByUserId が null になる（記録自体は残す設計）。
    // 名前未設定の在籍メンバーと区別して、退会済みであることを示す。
    ownerName: t.createdByUserId === null ? "退会したメンバー" : (t.createdBy?.name ?? null),
    paidByUserId: t.paidByUserId,
    paidByName: t.paidByUserId === null ? null : (t.paidBy?.name ?? "メンバー"),
    tags: t.tags.map((x) => x.tag),
    attachments: t.attachments,
    canEditThis:
      perm.canEditOthers || (t.createdByUserId !== null && t.createdByUserId === perm.userId),
  };
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const { ledgerId, user, canEdit, canAdd, canEditOthers, isPod, ledger, currency, beta } =
    await getAppContext();
  const perm = { canEditOthers, userId: user.id };
  const sp = await searchParams;
  const month = resolveMonth(sp.m);
  const view = sp.view === "calendar" ? "calendar" : "list";
  const type = sp.type === "INCOME" || sp.type === "EXPENSE" ? sp.type : undefined;
  const page = Number(sp.page) || 1;

  // カレンダー表示では一覧の検索・ページングは使わないため実行しない
  // （同じ月のデータを3回引かないようにする）。集計はどちらの表示でも要るので
  // カレンダー時は dailyTotals の結果から合算する。
  const [searchResult, categories, paymentMethods, calendar, saved, tags] = await Promise.all([
    view === "calendar"
      ? Promise.resolve(null)
      : searchTransactions(ledgerId, {
          month,
          keyword: sp.q?.trim() || undefined,
          type,
          categoryId: sp.cat || undefined,
          paymentMethodId: sp.pm || undefined,
          tagId: sp.tag || undefined,
          page,
        }),
    listAllCategories(ledgerId),
    listPaymentMethods(ledgerId),
    // カレンダーは1回のクエリで日別集計と明細をまとめて取る。
    view === "calendar" ? calendarMonth(ledgerId, month) : Promise.resolve(null),
    listSavedSearches(ledgerId, user.id),
    listTags(ledgerId),
  ]);

  const summary = calendar
    ? calendar.days.reduce(
        (a, d) => {
          a.income += d.income;
          a.expense += d.expense;
          a.balance = a.income - a.expense;
          return a;
        },
        { income: 0, expense: 0, balance: 0 },
      )
    : searchResult!.summary;
  const items: TxnListItem[] = searchResult
    ? searchResult.items.map((t) => toListItem(t, perm))
    : [];

  // 「払った人」を選べるのは共有帳簿のときだけ。1人の帳簿では欄そのものを出さない。
  const memberOpts = ledger.members.map((m) => ({
    id: m.userId,
    name: m.user.name ?? m.user.email ?? "メンバー",
  }));

  // 入力欄にはアーカイブ済みを出さない。絞り込みは過去データを追えるよう全件を出す。
  const catOpts = categories
    .filter((c) => !c.isArchived)
    .map((c) => ({ id: c.id, name: c.name, type: c.type }));
  const filterCatOpts = categories.map((c) => ({
    id: c.id,
    name: c.isArchived ? `${c.name}（アーカイブ済み）` : c.name,
    type: c.type,
  }));
  const pmOpts = paymentMethods.map((p) => ({ id: p.id, name: p.name }));

  return (
    <PageContainer width="list">
      <PageHeader
        title="家計簿"
        action={
          <div className="flex items-center gap-2">
            <ButtonLink href="/transactions/recurring" variant="gray" size="sm" aria-label="定期取引">
              <RepeatIcon size={16} />
              定期
            </ButtonLink>
            <MonthSwitcher current={monthParam(month)} todayParam={monthParam(new Date())} />
          </div>
        }
      />

      {/* カレンダー表示の集計バーと同じ意匠。1枚を3分割し、狭い端末でも金額を省略しない。 */}
      <Card className="mb-5 grid grid-cols-3 divide-x divide-border-subtle">
        <div className="min-w-0 px-1 py-3 text-center sm:px-4">
          <div className="text-[12px] text-text-tertiary">収入</div>
          <div className="mt-0.5 truncate text-[14px] font-bold tabular-nums text-income sm:text-[19px]">
            {formatMoney(summary.income, currency)}
          </div>
        </div>
        <div className="min-w-0 px-1 py-3 text-center sm:px-4">
          <div className="text-[12px] text-text-tertiary">支出</div>
          <div className="mt-0.5 truncate text-[14px] font-bold tabular-nums text-expense sm:text-[19px]">
            {formatMoney(summary.expense, currency)}
          </div>
        </div>
        <div className="min-w-0 px-1 py-3 text-center sm:px-4">
          <div className="text-[12px] text-text-tertiary">収支</div>
          <div
            className={`mt-0.5 truncate text-[14px] font-bold tabular-nums sm:text-[19px] ${
              summary.balance >= 0 ? "text-income" : "text-expense"
            }`}
          >
            {formatMoney(summary.balance, currency)}
          </div>
        </div>
      </Card>

      <div className="mb-4">
        <ViewSwitcher current={view} />
      </div>

      {view === "calendar" && calendar ? (
        <CalendarClient
          month={monthParam(month)}
          days={calendar.days}
          items={calendar.items.map((t) => toListItem(t, perm))}
          omitted={calendar.omitted}
          categories={catOpts}
          paymentMethods={pmOpts}
          canEdit={canEdit}
          currency={currency}
          betaAmountPad={beta("amount_pad")}
          betaHaptics={beta("haptics")}
          todayKey={todayLocal()}
        />
      ) : (
        <>
          <TransactionFilters
            categories={filterCatOpts}
            paymentMethods={pmOpts}
            current={{
              q: sp.q ?? "",
              type: type ?? "",
              cat: sp.cat ?? "",
              pm: sp.pm ?? "",
              tag: sp.tag ?? "",
            }}
            saved={saved.map((s) => ({ id: s.id, name: s.name, query: s.query }))}
            tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
            ledgerId={ledgerId}
          />

          <TransactionsClient
            items={items}
            categories={catOpts}
            paymentMethods={pmOpts}
            canEdit={canEdit}
            canAdd={canAdd}
            members={memberOpts}
            tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
            attachmentsEnabled={isAttachmentEnabled}
            showOwner={isPod}
            currency={currency}
            betaAmountPad={beta("amount_pad")}
            betaDuplicate={beta("swipe_duplicate")}
            betaHaptics={beta("haptics")}
            today={todayLocal()}
          />

          <Pagination page={searchResult!.page} pageCount={searchResult!.pageCount} />
        </>
      )}
    </PageContainer>
  );
}
