import type { Metadata } from "next";
import Link from "next/link";
import { getAppContext } from "@/lib/app-context";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingPlans } from "@/modules/billing/components/billing-plans";
import { BillingCard } from "@/modules/billing/components/billing-card";
import { PLANS } from "@/lib/plans";
import { isStripeEnabled } from "@/lib/env";
import { ChevronRightIcon } from "@/components/icons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "プラン・お支払い", noindex: true });

export default async function BillingPage() {
  const { user, tier } = await getAppContext();
  const plan = PLANS[tier];

  return (
    <PageContainer>
      <PageHeader title="プラン・お支払い" subtitle="あなたのプランを管理します。" />

      <Card className="mb-6">
        <CardBody className="pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] text-text-tertiary">アカウント</div>
              <div className="truncate text-[15px] font-medium">{user.email}</div>
            </div>
            <Badge tone={tier === "PRO" ? "pod" : tier === "PLUS" ? "accent" : "neutral"} size="md">
              {plan.name}プラン
            </Badge>
          </div>
          <div className="mt-4 border-t border-border-subtle pt-4">
            <BillingCard tier={tier} stripeEnabled={isStripeEnabled} />
          </div>
        </CardBody>
      </Card>

      <BillingPlans currentTier={tier} stripeEnabled={isStripeEnabled} />

      <div className="mt-8 text-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[14px] font-medium text-accent"
        >
          ダッシュボードへ進む
          <ChevronRightIcon size={16} />
        </Link>
      </div>
    </PageContainer>
  );
}
