import type { Metadata } from "next";
import { getAppContext, resolveMonth, monthParam } from "@/lib/app-context";
import {
  searchTransactions,
  listCategories,
  listPaymentMethods,
} from "@/modules/transactions/queries";
import {
  TransactionsClient,
  type TxnListItem,
  TransactionFilters,
  Pagination,
} from "@/modules/transactions";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { MonthSwitcher } from "@/components/app/month-switcher";
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
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const { ledgerId, canEdit, isPod, currency, betaOptIn } = await getAppContext();
  const sp = await searchParams;
  const month = resolveMonth(sp.m);
  const type = sp.type === "INCOME" || sp.type === "EXPENSE" ? sp.type : undefined;
  const page = Number(sp.page) || 1;

  const [result, categories, paymentMethods] = await Promise.all([
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
  ]);

  const { items: txns, summary, pageCount } = result;

  const items: TxnListItem[] = txns.map((t) => ({
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
  }));

  const catOpts = categories.map((c) => ({ id: c.id, name: c.name, type: c.type }));
  const pmOpts = paymentMethods.map((p) => ({ id: p.id, name: p.name }));

  return (
    <PageContainer>
      <PageHeader title="家計簿" action={<MonthSwitcher current={monthParam(month)} />} />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-[12px] text-text-tertiary">収入</div>
          <div className="mt-1 text-[19px] font-bold tabular-nums text-income">
            {formatMoney(summary.income, currency)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-text-tertiary">支出</div>
          <div className="mt-1 text-[19px] font-bold tabular-nums">
            {formatMoney(summary.expense, currency)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-text-tertiary">収支</div>
          <div
            className={`mt-1 text-[19px] font-bold tabular-nums ${
              summary.balance >= 0 ? "text-income" : "text-expense"
            }`}
          >
            {formatMoney(summary.balance, currency)}
          </div>
        </Card>
      </div>

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
    </PageContainer>
  );
}
