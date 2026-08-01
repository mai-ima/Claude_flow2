import type { Metadata } from "next";
import Link from "next/link";
import { getAppContext } from "@/lib/app-context";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { allPriceChanges } from "@/modules/subscriptions/queries";
import { summarizePriceChanges } from "@/modules/subscriptions/insights";
import { PriceChangesClient, type PriceChangeView } from "@/modules/subscriptions";
import { formatDate } from "@/lib/date";
import { STATUS_LABEL, type BillingCycle } from "@/lib/enums";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "価格の変更", noindex: true });

export default async function PriceChangesPage() {
  const { ledgerId, currency } = await getAppContext();
  const changes = await allPriceChanges(ledgerId);

  // 年額換算の影響が大きい順に並べる。並べ替えは純関数側に置いてあり、
  // 単体テストで押さえてある。
  const summarized = summarizePriceChanges(
    changes.map((c) => ({
      subscriptionId: c.subscriptionId,
      name: c.name,
      oldAmount: c.oldAmount,
      newAmount: c.newAmount,
      changedAt: c.changedAt,
      cycle: c.cycle as BillingCycle,
    })),
  );

  // 並べ替え後に id と状態を戻す。同じサブスクで同日同額の改定が
  // 二度あることは無いので、この組で一意に引ける。
  const metaOf = new Map(
    changes.map((c) => [
      `${c.subscriptionId}|${c.changedAt.getTime()}|${c.oldAmount}|${c.newAmount}`,
      c,
    ]),
  );

  const rows: PriceChangeView[] = summarized.map((r, i) => {
    const meta = metaOf.get(
      `${r.subscriptionId}|${r.changedAt.getTime()}|${r.oldAmount}|${r.newAmount}`,
    );
    return {
      id: meta?.id ?? `${r.subscriptionId}-${i}`,
      subscriptionId: r.subscriptionId,
      name: r.name,
      statusLabel: STATUS_LABEL[(meta?.status ?? "ACTIVE") as keyof typeof STATUS_LABEL],
      active: meta?.status !== "CANCELED",
      dateLabel: formatDate(r.changedAt, "yyyy年M月d日"),
      oldAmount: r.oldAmount,
      newAmount: r.newAmount,
      diff: r.diff,
      percent: r.percent,
      yearlyDiff: r.yearlyDiff,
    };
  });

  return (
    <PageContainer width="list">
      <PageHeader title="価格の変更" subtitle="値上げ・値下げを、年額の影響で並べて。" />
      <PriceChangesClient rows={rows} currency={currency} />
      <div className="mt-6">
        <Link href="/subscriptions" className="inline-flex min-h-11 items-center text-[14px] font-medium text-accent">
          サブスク一覧へ戻る
        </Link>
      </div>
    </PageContainer>
  );
}
