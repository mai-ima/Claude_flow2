import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import {
  listPaymentMethods,
  listAllCategories,
  listTags,
} from "@/modules/transactions/queries";
import { TagManager } from "@/modules/transactions";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { ListGroup } from "@/components/ui/list";
import { SettingsBack } from "@/modules/account";
import { PaymentMethodsManager, CategoryManager } from "@/modules/account";
import { LedgerSettingsForm } from "@/modules/ledgers";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "帳簿の中身", noindex: true });

export default async function LedgerSettingsPage() {
  const ctx = await getAppContext();
  const [methods, categories, tags] = await Promise.all([
    listPaymentMethods(ctx.ledgerId),
    listAllCategories(ctx.ledgerId),
    listTags(ctx.ledgerId),
  ]);

  return (
    <PageContainer width="list">
      <PageHeader title="帳簿の中身" />
      <SettingsBack />

      <div className="space-y-6">
        <ListGroup title="帳簿" padded>
          <LedgerSettingsForm
            ledgerId={ctx.ledgerId}
            name={ctx.ledger.name}
            currency={ctx.currency}
            canEdit={ctx.role === "OWNER"}
          />
        </ListGroup>

        <ListGroup title="カテゴリ" padded>
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

        <ListGroup title="タグ" padded>
          <TagManager tags={tags} />
        </ListGroup>

        <ListGroup title="支払い方法" padded>
          <PaymentMethodsManager
            methods={methods.map((m) => ({
              id: m.id,
              name: m.name,
              type: m.type,
              color: m.color,
            }))}
          />
        </ListGroup>
      </div>
    </PageContainer>
  );
}
