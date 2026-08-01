import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { ListGroup } from "@/components/ui/list";
import { SettingsBack } from "@/modules/account";
import { listPendingInvites } from "@/modules/ledgers/invites";
import { ledgerMemberLimit } from "@/modules/ledgers/queries";
import { FamilySharing } from "@/modules/ledgers";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "ファミリー共有", noindex: true });

export default async function SharingSettingsPage() {
  const ctx = await getAppContext();
  const [maxMembers, invites] = await Promise.all([
    ledgerMemberLimit(ctx.ledger.ownerId),
    listPendingInvites(ctx.ledgerId),
  ]);

  const members = ctx.ledger.members.map((m) => ({
    userId: m.userId,
    name: m.user.name ?? m.user.email ?? "メンバー",
    role: m.role,
    isOwner: m.userId === ctx.ledger.ownerId,
  }));

  return (
    <PageContainer width="list">
      <PageHeader title="ファミリー共有" />
      <SettingsBack />

      <ListGroup title="メンバー" padded>
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
    </PageContainer>
  );
}
