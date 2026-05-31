import type { Metadata } from "next";
import { getAppContext, resolveMonth, monthParam } from "@/lib/app-context";
import {
  listTransactions,
  monthSummary,
  listCategories,
  listPaymentMethods,
} from "@/modules/transactions/queries";
import {
  TransactionsClient,
  type TxnListItem,
} from "@/modules/transactions/components/transactions-client";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { MonthSwitcher } from "@/components/app/month-switcher";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "家計簿", noindex: true });

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { ledgerId, canEdit, isPod } = await getAppContext();
  const { m } = await searchParams;
  const month = resolveMonth(m);

  const [txns, summary, categories, paymentMethods] = await Promise.all([
    listTransactions(ledgerId, month),
    monthSummary(ledgerId, month),
    listCategories(ledgerId),
    listPaymentMethods(ledgerId),
  ]);

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

  return (
    <PageContainer>
      <PageHeader title="家計簿" action={<MonthSwitcher current={monthParam(month)} />} />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-[12px] text-text-tertiary">収入</div>
          <div className="mt-1 text-[19px] font-bold tabular-nums text-income">
            {formatMoney(summary.income)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-text-tertiary">支出</div>
          <div className="mt-1 text-[19px] font-bold tabular-nums">
            {formatMoney(summary.expense)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-text-tertiary">収支</div>
          <div
            className={`mt-1 text-[19px] font-bold tabular-nums ${
              summary.balance >= 0 ? "text-income" : "text-expense"
            }`}
          >
            {formatMoney(summary.balance)}
          </div>
        </Card>
      </div>

      <TransactionsClient
        items={items}
        categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
        paymentMethods={paymentMethods.map((p) => ({ id: p.id, name: p.name }))}
        canEdit={canEdit}
        showOwner={isPod}
      />
    </PageContainer>
  );
}
