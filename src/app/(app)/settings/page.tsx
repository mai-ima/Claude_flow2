import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import { listPaymentMethods, listAllCategories } from "@/modules/transactions/queries";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ProfileForm } from "@/modules/account/components/profile-form";
import { PaymentMethodsManager } from "@/modules/account/components/payment-methods-manager";
import { CategoryManager } from "@/modules/account/components/category-manager";
import { DangerZone } from "@/modules/account/components/danger-zone";
import { FamilySharing } from "@/modules/ledgers/components/family-sharing";
import { BillingCard } from "@/modules/billing/components/billing-card";
import { PLANS } from "@/lib/plans";
import { isStripeEnabled } from "@/lib/env";
import { SITE, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "設定", noindex: true });

export default async function SettingsPage() {
  const ctx = await getAppContext();
  const [methods, categories] = await Promise.all([
    listPaymentMethods(ctx.ledgerId),
    listAllCategories(ctx.ledgerId),
  ]);

  const members = ctx.ledger.members.map((m) => ({
    userId: m.userId,
    name: m.user.name ?? m.user.email ?? "メンバー",
    role: m.role,
    isOwner: m.userId === ctx.ledger.ownerId,
  }));

  return (
    <PageContainer>
      <PageHeader title="設定" />

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>プロフィール</CardTitle>
          </CardHeader>
          <CardBody>
            <ProfileForm name={ctx.user.name ?? ""} wage={ctx.user.assumedHourlyWage} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>外観</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-text-secondary">テーマ</span>
              <ThemeToggle />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>プラン</CardTitle>
          </CardHeader>
          <CardBody>
            <BillingCard tier={ctx.tier} stripeEnabled={isStripeEnabled} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ファミリー共有</CardTitle>
          </CardHeader>
          <CardBody>
            <FamilySharing
              ledgerId={ctx.ledgerId}
              isPod={ctx.isPod}
              isOwner={ctx.role === "OWNER"}
              members={members}
              maxMembers={PLANS[ctx.tier].maxMembers}
              tier={ctx.tier}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>支払い方法</CardTitle>
          </CardHeader>
          <CardBody>
            <PaymentMethodsManager
              methods={methods.map((m) => ({
                id: m.id,
                name: m.name,
                type: m.type,
                color: m.color,
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>カテゴリ管理</CardTitle>
          </CardHeader>
          <CardBody>
            <CategoryManager
              categories={categories.map((c) => ({
                id: c.id,
                name: c.name,
                type: c.type,
                icon: c.icon,
                color: c.color,
                isArchived: c.isArchived,
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>アカウント</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-text-secondary">メールアドレス</span>
              <span className="text-[14px] font-medium">{ctx.user.email}</span>
            </div>
            <div className="border-t border-border-subtle pt-4">
              <DangerZone />
            </div>
          </CardBody>
        </Card>

        <p className="pt-2 text-center text-[12px] text-text-tertiary">
          {SITE.name} ・ バージョン 1.0.0
        </p>
      </div>
    </PageContainer>
  );
}
