import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import { listGoals } from "@/modules/goals/queries";
import { GoalsClient, type GoalItem } from "@/modules/goals";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { TargetIcon } from "@/components/icons";
import { canUse } from "@/lib/plans";
import { formatDate, monthsUntil } from "@/lib/date";
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
  const items: GoalItem[] = goals.map((g) => {
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    const done = g.currentAmount >= g.targetAmount;
    // 期日ありなら「達成に必要な月額」と期限超過を算出（積立履歴は持たないので残月で按分）。
    let monthsLeft: number | null = null;
    let monthlyNeeded: number | null = null;
    let overdue = false;
    if (g.deadline && !done) {
      const m = monthsUntil(g.deadline);
      if (m < 0) {
        overdue = true;
      } else {
        monthsLeft = m;
        monthlyNeeded = Math.ceil(remaining / Math.max(1, m));
      }
    }
    return {
      id: g.id,
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      deadlineLabel: g.deadline ? formatDate(g.deadline, "yyyy年M月d日") : null,
      color: g.color,
      monthsLeft,
      monthlyNeeded,
      overdue,
    };
  });

  // 全体サマリー
  const totalCurrent = items.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = items.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <PageContainer>
      <PageHeader title="貯金目標" subtitle="貯めたい未来を、かたちに。" />
      <GoalsClient
        goals={items}
        canEdit={canEdit}
        currency={currency}
        totalCurrent={totalCurrent}
        totalTarget={totalTarget}
      />
    </PageContainer>
  );
}
