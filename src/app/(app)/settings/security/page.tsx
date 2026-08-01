import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { ListGroup } from "@/components/ui/list";
import {
  SettingsBack,
  PasswordForm,
  SessionList,
  EmailVerification,
  TwoFactorSettings,
} from "@/modules/account";
import { listSessions } from "@/modules/account/queries";
import { twoFactorStatus } from "@/lib/two-factor";
import { isEmailEnabled } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "ログインと安全性", noindex: true });

export default async function SecuritySettingsPage() {
  const ctx = await getAppContext();
  const [sessionRows, twoFactor] = await Promise.all([
    listSessions(ctx.user.id),
    twoFactorStatus(ctx.user.id),
  ]);

  // Date のままクライアントへ渡さない（表示は相対時間だけで足りる）。
  const sessions = sessionRows.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    lastUsedAt: s.lastUsedAt.toISOString(),
  }));

  return (
    <PageContainer width="list">
      <PageHeader title="ログインと安全性" />
      <SettingsBack />

      <div className="space-y-6">
        <ListGroup title="メールアドレス" padded>
          <EmailVerification
            email={ctx.user.email}
            verified={ctx.user.emailVerified}
            emailEnabled={isEmailEnabled}
          />
        </ListGroup>

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
      </div>
    </PageContainer>
  );
}
