import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import { listPaymentMethods, listAllCategories } from "@/modules/transactions/queries";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { ListGroup, ListRow } from "@/components/ui/list";
import { ShieldIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SkinPicker } from "@/components/theme/skin-picker";
import {
  ProfileForm,
  PaymentMethodsManager,
  CategoryManager,
  DangerZone,
  DeleteAllData,
  DataTools,
  BetaFeaturesToggle,
  PasswordForm,
  SessionList,
  EmailVerification,
  TwoFactorSettings,
} from "@/modules/account";
import { listSessions } from "@/modules/account/queries";
import { twoFactorStatus } from "@/lib/two-factor";
import { listPendingInvites } from "@/modules/ledgers/invites";
import { FamilySharing, LedgerSettingsForm } from "@/modules/ledgers";
import { BillingCard } from "@/modules/billing";
import { tierAtLeast } from "@/lib/plans";
import { isStripeEnabled, isEmailEnabled } from "@/lib/env";
import { SITE, APP_VERSION, pageMetadata } from "@/lib/seo";
import { enabledBetaFeatures } from "@/lib/beta-features";
import { ledgerMemberLimit } from "@/modules/ledgers/queries";

export const metadata: Metadata = pageMetadata({ title: "設定", noindex: true });

export default async function SettingsPage() {
  const ctx = await getAppContext();
  const [methods, categories, maxMembers, sessionRows, twoFactor, invites] = await Promise.all([
    listPaymentMethods(ctx.ledgerId),
    listAllCategories(ctx.ledgerId),
    ledgerMemberLimit(ctx.ledger.ownerId),
    listSessions(ctx.user.id),
    twoFactorStatus(ctx.user.id),
    listPendingInvites(ctx.ledgerId),
  ]);

  // Date のままクライアントへ渡さない（表示は相対時間だけで足りる）。
  const sessions = sessionRows.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    lastUsedAt: s.lastUsedAt.toISOString(),
  }));

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
          <BetaFeaturesToggle
            enabled={ctx.betaOptIn}
            features={enabledBetaFeatures({ optIn: ctx.betaOptIn, features: ctx.user.betaFeatures })}
          />
        </ListGroup>

        <ListGroup title="外観" padded>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[14px] text-text-secondary">テーマ</span>
              <ThemeToggle />
            </div>
            <div className="border-t border-border-subtle pt-4">
              <div className="mb-2.5 text-[14px] text-text-secondary">スキン</div>
              <SkinPicker />
            </div>
          </div>
        </ListGroup>

        <ListGroup title="プラン" padded>
          <BillingCard tier={ctx.tier} stripeEnabled={isStripeEnabled} />
        </ListGroup>

        <ListGroup title="ファミリー共有" padded>
          <FamilySharing
            ledgerId={ctx.ledgerId}
            ledgerName={ctx.ledger.name}
            isPod={ctx.isPod}
            isOwner={ctx.role === "OWNER"}
            members={members}
            pendingInvites={invites.map((i) => ({ id: i.id, email: i.email, role: i.role }))}
            maxMembers={maxMembers}
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
              parentId: c.parentId,
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

        <ListGroup title="パスワード" padded>
          <PasswordForm />
        </ListGroup>

        <ListGroup title="二要素認証" padded>
          <TwoFactorSettings
            enabled={twoFactor.enabled}
            remainingRecoveryCodes={twoFactor.remainingRecoveryCodes}
          />
        </ListGroup>

        <ListGroup title="ログイン中の端末" padded>
          <SessionList sessions={sessions} />
        </ListGroup>

        <ListGroup title="アカウント" padded bodyClassName="space-y-4">
          <EmailVerification
            email={ctx.user.email}
            verified={ctx.user.emailVerified}
            emailEnabled={isEmailEnabled}
          />
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
