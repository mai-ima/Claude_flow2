import type { Metadata } from "next";
import Link from "next/link";
import { getAppContext, resolveMonth, monthParam } from "@/lib/app-context";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { settlementView } from "@/modules/ledgers/queries";
import { SettlementClient } from "@/modules/ledgers";
import { formatDate, formatMonth, todayLocal, addMonthsJST } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "精算", noindex: true });

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { ledgerId, currency, canEdit, role } = await getAppContext();
  const { m } = await searchParams;
  const month = resolveMonth(m);
  const view = await settlementView(ledgerId, month);

  // 月の前後は日本時間の暦で数える。ローカルの年月で数えると、
  // サーバーが UTC のとき月アンカーが前月末に見えてひと月ずれる。
  const prev = addMonthsJST(month, -1);
  const next = addMonthsJST(month, 1);

  return (
    <PageContainer width="list">
      <PageHeader title="精算" subtitle="誰がいくら払って、いくら渡せばよいか。" />

      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/settlement?m=${monthParam(prev)}`}
          className="inline-flex min-h-11 items-center rounded-full px-3 text-[13px] font-medium text-accent"
        >
          ← 前の月
        </Link>
        <span className="text-[14px] font-semibold">{formatMonth(month)}</span>
        <Link
          href={`/settlement?m=${monthParam(next)}`}
          className="inline-flex min-h-11 items-center rounded-full px-3 text-[13px] font-medium text-accent"
        >
          次の月 →
        </Link>
      </div>

      <SettlementClient
        monthLabel={formatMonth(month)}
        total={view.total}
        unassigned={view.unassigned}
        members={view.members}
        transfers={view.transfers}
        records={view.records.map((r) => ({
          id: r.id,
          fromName: r.fromName,
          toName: r.toName,
          amount: r.amount,
          dateLabel: formatDate(r.settledAt, "yyyy年M月d日"),
          memo: r.memo,
        }))}
        currency={currency}
        canEdit={canEdit}
        isOwner={role === "OWNER"}
        ledgerId={ledgerId}
        today={todayLocal()}
      />
    </PageContainer>
  );
}
