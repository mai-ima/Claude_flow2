import type { Metadata } from "next";
import { adminStats } from "@/modules/admin/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "管理コンソール", noindex: true });
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const s = await adminStats();

  const cards = [
    { label: "ユーザー", value: s.users.toLocaleString(), sub: `+${s.newUsers7d}（過去7日）` },
    { label: "帳簿", value: s.ledgers.toLocaleString() },
    { label: "取引", value: s.transactions.toLocaleString() },
    { label: "サブスク", value: s.subscriptions.toLocaleString() },
    { label: "貯金目標", value: s.goals.toLocaleString() },
    { label: "推定 MRR", value: formatMoney(s.mrr), sub: "月次経常収益" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">概要</h1>
        <p className="mt-1 text-[14px] text-text-secondary">アプリ全体の状況をひと目で。</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="text-[12px] text-text-tertiary">{c.label}</div>
            <div className="mt-1 text-[24px] font-bold tabular-nums tracking-tight">{c.value}</div>
            {c.sub && <div className="mt-0.5 text-[12px] text-text-tertiary">{c.sub}</div>}
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-3 text-[13px] font-semibold text-text-secondary">プラン内訳</div>
        <div className="grid grid-cols-3 gap-3">
          {(["FREE", "PLUS", "PRO"] as const).map((t) => (
            <div key={t} className="rounded-xl bg-surface-2 p-4 text-center">
              <Badge tone={t === "PRO" ? "pod" : t === "PLUS" ? "accent" : "neutral"} size="sm">
                {t}
              </Badge>
              <div className="mt-2 text-[22px] font-bold tabular-nums">{s.tierCounts[t]}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
