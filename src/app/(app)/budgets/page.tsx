import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import { listBudgetsWithSpending } from "@/modules/budgets/queries";
import { listCategories } from "@/modules/transactions/queries";
import { BudgetsClient, type BudgetItem } from "@/modules/budgets";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { TargetIcon } from "@/components/icons";
import { canUse } from "@/lib/plans";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "予算", noindex: true });

export default async function BudgetsPage() {
  const { ledgerId, canEdit, tier, currency, betaOptIn } = await getAppContext();

  if (!canUse(tier, "budgets")) {
    return (
      <PageContainer>
        <PageHeader title="予算" />
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
            <TargetIcon size={32} />
          </div>
          <h2 className="text-[20px] font-bold tracking-tight">予算管理はプラス以上の機能です</h2>
          <p className="max-w-sm text-[15px] text-text-secondary">
            全体やカテゴリごとに月の予算を決めて、使いすぎを防ぎましょう。プラスにアップグレードすると利用できます。
          </p>
          <ButtonLink href="/billing">アップグレード</ButtonLink>
        </Card>
      </PageContainer>
    );
  }

  const [{ total, categories }, allCategories] = await Promise.all([
    listBudgetsWithSpending(ledgerId),
    listCategories(ledgerId),
  ]);

  const totalItem: BudgetItem | null = total;
  const categoryItems: BudgetItem[] = categories;
  const expenseCats = allCategories.filter((c) => c.type === "EXPENSE");

  return (
    <PageContainer>
      <PageHeader title="予算" subtitle="使いすぎを、早めに防ぐ。" />
      <BudgetsClient
        total={totalItem}
        categories={categoryItems}
        allCategories={expenseCats.map((c) => ({ id: c.id, name: c.name }))}
        canEdit={canEdit}
        currency={currency}
        beta={betaOptIn}
      />
    </PageContainer>
  );
}
