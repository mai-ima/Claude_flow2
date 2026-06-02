import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import { listGoals } from "@/modules/goals/queries";
import { GoalsClient, type GoalItem } from "@/modules/goals/components/goals-client";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { TargetIcon } from "@/components/icons";
import { canUse } from "@/lib/plans";
import { formatDate } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "貯金目標", noindex: true });

export default async function GoalsPage() {
  const { ledgerId, canEdit, tier, currency } = await getAppContext();

  if (!canUse(tier, "goals")) {
    return (
      <PageContainer>
        <PageHeader title="貯金目標" />
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
            <TargetIcon size={32} />
          </div>
          <h2 className="text-[20px] font-bold tracking-tight">貯金目標はプラス以上の機能です</h2>
          <p className="max-w-sm text-[15px] text-text-secondary">
            目標額と期日を決めて、コツコツ積み立て。プラスにアップグレードすると利用できます。
          </p>
          <ButtonLink href="/billing">アップグレード</ButtonLink>
        </Card>
      </PageContainer>
    );
  }

  const goals = await listGoals(ledgerId);
  const items: GoalItem[] = goals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    deadlineLabel: g.deadline ? formatDate(g.deadline, "yyyy年M月d日") : null,
    color: g.color,
  }));

  return (
    <PageContainer>
      <PageHeader title="貯金目標" subtitle="貯めたい未来を、かたちに。" />
      <GoalsClient goals={items} canEdit={canEdit} currency={currency} />
    </PageContainer>
  );
}
