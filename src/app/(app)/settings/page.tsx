import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import { listPaymentMethods, listAllCategories } from "@/modules/transactions/queries";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { ListGroup, ListRow } from "@/components/ui/list";
import { ShieldIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  ProfileForm,
  PaymentMethodsManager,
  CategoryManager,
  DangerZone,
  DeleteAllData,
  DataTools,
  BetaFeaturesToggle,
  AlphaFeaturesToggle,
} from "@/modules/account";
import { FamilySharing, LedgerSettingsForm } from "@/modules/ledgers";
import { BillingCard } from "@/modules/billing";
import { PLANS, tierAtLeast } from "@/lib/plans";
import { isStripeEnabled } from "@/lib/env";
import { SITE, APP_VERSION, pageMetadata } from "@/lib/seo";

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

      <div className="space-y-6">
        <ListGroup title="プロフィール" padded>
          <ProfileForm name={ctx.user.name ?? ""} wage={ctx.user.assumedHourlyWage} />
        </ListGroup>

        <ListGroup title="帳簿" padded>
          <LedgerSettingsForm
            ledgerId={ctx.ledgerId}
            name={ctx.ledger.name}
            currency={ctx.currency}
            canEdit={ctx.role === "OWNER"}
          />
        </ListGroup>

        <ListGroup title="ベータ機能" padded>
          <BetaFeaturesToggle enabled={ctx.betaOptIn} />
        </ListGroup>

        <ListGroup title="α（実験的）機能" padded>
          <AlphaFeaturesToggle enabled={ctx.alphaOptIn} />
        </ListGroup>

        <ListGroup title="外観" padded>
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-text-secondary">テーマ</span>
            <ThemeToggle />
          </div>
        </ListGroup>

        <ListGroup title="プラン" padded>
          <BillingCard tier={ctx.tier} stripeEnabled={isStripeEnabled} />
        </ListGroup>

        <ListGroup title="ファミリー共有" padded>
          <FamilySharing
            ledgerId={ctx.ledgerId}
            isPod={ctx.isPod}
            isOwner={ctx.role === "OWNER"}
            members={members}
            maxMembers={PLANS[ctx.tier].maxMembers}
            tier={ctx.tier}
          />
        </ListGroup>

        <ListGroup title="支払い方法" padded>
          <PaymentMethodsManager
            methods={methods.map((m) => ({ id: m.id, name: m.name, type: m.type, color: m.color }))}
          />
        </ListGroup>

        <ListGroup title="カテゴリ管理" padded>
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
        </ListGroup>

        <ListGroup title="データ（CSV）" padded>
          <DataTools isPro={tierAtLeast(ctx.tier, "PRO")} />
        </ListGroup>

        {ctx.user.isAdmin && (
          <ListGroup title="管理者">
            <ListRow
              href="/admin"
              icon={<ShieldIcon size={18} />}
              iconBg="bg-pod"
              label="管理コンソール"
              sublabel="アプリ全体の監視・管理"
            />
          </ListGroup>
        )}

        <ListGroup title="アカウント" padded bodyClassName="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-text-secondary">メールアドレス</span>
            <span className="text-[14px] font-medium">{ctx.user.email}</span>
          </div>
          {ctx.role === "OWNER" && (
            <div className="border-t border-border-subtle pt-4">
              <DeleteAllData />
            </div>
          )}
          <div className="border-t border-border-subtle pt-4">
            <DangerZone />
          </div>
        </ListGroup>

        <p className="pt-2 text-center text-[12px] text-text-tertiary">
          {SITE.name} ・ ベータ v{APP_VERSION}
        </p>
      </div>
    </PageContainer>
  );
}
