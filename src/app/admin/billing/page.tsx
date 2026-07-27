import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStripeEnabled } from "@/lib/stripe";
import { revenueStats } from "@/modules/admin/queries";
import { StripeReconcile } from "@/modules/admin/components/stripe-reconcile";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "課金運用", noindex: true });

export default async function AdminBillingPage() {
  await requireAdmin();
  const [revenue, events] = await Promise.all([
    revenueStats(),
    db.stripeEvent.findMany({ orderBy: { processedAt: "desc" }, take: 30 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">課金運用</h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          Stripe との突合と、受信したイベントの履歴です。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-3">
          <div className="text-[12px] text-text-tertiary">MRR</div>
          <div className="mt-0.5 text-[20px] font-bold tabular-nums">
            {formatMoney(revenue.mrr)}
          </div>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-3">
          <div className="text-[12px] text-text-tertiary">プラス</div>
          <div className="mt-0.5 text-[20px] font-bold tabular-nums">{revenue.plus}</div>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-3">
          <div className="text-[12px] text-text-tertiary">プロ</div>
          <div className="mt-0.5 text-[20px] font-bold tabular-nums">{revenue.pro}</div>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-3">
          <div className="text-[12px] text-text-tertiary">解約予告中</div>
          <div className="mt-0.5 text-[20px] font-bold tabular-nums">{revenue.cancelling}</div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold">Stripe との突合</h2>
        <p className="text-[13px] text-text-secondary">
          webhook を取りこぼすと、こちらのプランと Stripe の契約がずれます。照合して差分を確認できます。
        </p>
        <StripeReconcile enabled={isStripeEnabled} />
      </section>

      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold">受信したイベント</h2>
        {events.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-text-secondary">
            まだ受信していません。
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-baseline gap-2 border-t border-border-subtle px-4 py-2.5 text-[13px] first:border-t-0"
              >
                <span className="font-medium">{e.type}</span>
                <span className="font-mono text-[11px] text-text-tertiary">{e.id}</span>
                <span className="ml-auto tabular-nums text-text-tertiary">
                  {formatDate(e.processedAt, "M/d HH:mm")}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[12px] text-text-tertiary">
          同じ ID のイベントは一度しか処理しません。ここに出ていれば処理済みです。
        </p>
      </section>
    </div>
  );
}
