import type { Metadata } from "next";
import Link from "next/link";
import { getAppContext } from "@/lib/app-context";
import {
  listRecurring,
  listCategories,
  listPaymentMethods,
} from "@/modules/transactions/queries";
import { RecurringClient, type RecurringListItem } from "@/modules/transactions";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/icons";
import { formatDate } from "@/lib/date";
import type { BillingCycle } from "@/lib/enums";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "定期取引", noindex: true });

export default async function RecurringPage() {
  const { ledgerId, canEdit, currency } = await getAppContext();

  const [rows, categories, paymentMethods] = await Promise.all([
    listRecurring(ledgerId),
    listCategories(ledgerId),
    listPaymentMethods(ledgerId),
  ]);

  const items: RecurringListItem[] = rows.map((r) => ({
    id: r.id,
    type: r.type as "INCOME" | "EXPENSE",
    amount: r.amount,
    cycle: r.cycle as BillingCycle,
    nextRunAt: r.nextRunAt.toISOString(),
    nextRunLabel: formatDate(r.nextRunAt, "M月d日"),
    active: r.active,
    memo: r.memo,
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? "未分類",
    categoryIcon: r.category?.icon ?? "tag",
    paymentMethodId: r.paymentMethodId,
    paymentName: r.paymentMethod?.name ?? null,
  }));

  const catOpts = categories.map((c) => ({ id: c.id, name: c.name, type: c.type }));
  const pmOpts = paymentMethods.map((p) => ({ id: p.id, name: p.name }));

  return (
    <PageContainer>
      <PageHeader
        title="定期取引"
        subtitle="毎月・毎週など、決まった収支を自動で記録します。"
        action={
          <ButtonLink href="/transactions" variant="gray" size="sm">
            家計簿へ戻る
          </ButtonLink>
        }
      />

      <RecurringClient
        items={items}
        categories={catOpts}
        paymentMethods={pmOpts}
        canEdit={canEdit}
        currency={currency}
      />

      <div className="mt-6 text-center">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-[13px] text-text-tertiary hover:text-text-secondary"
        >
          通常の家計簿を見る
          <ChevronRightIcon size={14} />
        </Link>
      </div>
    </PageContainer>
  );
}
