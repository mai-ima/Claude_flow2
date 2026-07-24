import type { Metadata } from "next";
import { getAppContext, resolveMonth, monthParam } from "@/lib/app-context";
import {
  searchTransactions,
  listTransactions,
  dailyTotals,
  listCategories,
  listPaymentMethods,
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
import { formatDate } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "家計簿", noindex: true });

type SP = {
  m?: string;
  q?: string;
  type?: string;
  cat?: string;
  pm?: string;
  page?: string;
  view?: string;
};

/** Transaction 行 → クライアント表示用の項目へ変換。 */
function toListItem(t: {
  id: string;
  type: string;
  amount: number;
  occurredAt: Date;
  memo: string | null;
  categoryId: string | null;
  paymentMethodId: string | null;
  category: { name: string; icon: string } | null;
  paymentMethod: { name: string } | null;
  createdBy: { name: string | null } | null;
}): TxnListItem {
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
    ownerName: t.createdBy?.name ?? null,
  };
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const { ledgerId, canEdit, isPod, currency, betaOptIn } = await getAppContext();
  const sp = await searchParams;
  const month = resolveMonth(sp.m);
  const view = sp.view === "calendar" ? "calendar" : "list";
  const type = sp.type === "INCOME" || sp.type === "EXPENSE" ? sp.type : undefined;
  const page = Number(sp.page) || 1;

  const [result, categories, paymentMethods, calendar] = await Promise.all([
    searchTransactions(ledgerId, {
      month,
      keyword: sp.q?.trim() || undefined,
      type,
      categoryId: sp.cat || undefined,
      paymentMethodId: sp.pm || undefined,
      page,
    }),
    listCategories(ledgerId),
    listPaymentMethods(ledgerId),
    view === "calendar"
      ? Promise.all([dailyTotals(ledgerId, month), listTransactions(ledgerId, month)])
      : Promise.resolve(null),
  ]);

  const { items: txns, summary, pageCount } = result;
  const items: TxnListItem[] = txns.map(toListItem);

  const catOpts = categories.map((c) => ({ id: c.id, name: c.name, type: c.type }));
  const pmOpts = paymentMethods.map((p) => ({ id: p.id, name: p.name }));

  return (
    <PageContainer>
      <PageHeader
        title="家計簿"
        action={
          <div className="flex items-center gap-2">
            <ButtonLink href="/transactions/recurring" variant="gray" size="sm" aria-label="定期取引">
              <RepeatIcon size={16} />
              定期
            </ButtonLink>
            <MonthSwitcher current={monthParam(month)} />
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
          days={calendar[0]}
          items={calendar[1].map(toListItem)}
          categories={catOpts}
          paymentMethods={pmOpts}
          canEdit={canEdit}
          currency={currency}
          beta={betaOptIn}
        />
      ) : (
        <>
          <TransactionFilters
            categories={catOpts}
            paymentMethods={pmOpts}
            current={{
              q: sp.q ?? "",
              type: type ?? "",
              cat: sp.cat ?? "",
              pm: sp.pm ?? "",
            }}
          />

          <TransactionsClient
            items={items}
            categories={catOpts}
            paymentMethods={pmOpts}
            canEdit={canEdit}
            showOwner={isPod}
            currency={currency}
            beta={betaOptIn}
          />

          <Pagination page={result.page} pageCount={pageCount} />
        </>
      )}
    </PageContainer>
  );
}
