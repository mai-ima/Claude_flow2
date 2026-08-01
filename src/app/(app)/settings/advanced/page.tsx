import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { ListGroup } from "@/components/ui/list";
import {
  SettingsBack,
  DataTools,
  BetaFeaturesToggle,
  DeleteAllData,
  DangerZone,
} from "@/modules/account";
import { FeedbackEntry } from "@/modules/feedback";
import { myFeedbackCounts } from "@/modules/feedback/queries";
import { tierAtLeast } from "@/lib/plans";
import { enabledBetaFeatures } from "@/lib/beta-features";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "データとその他", noindex: true });

export default async function AdvancedSettingsPage() {
  const ctx = await getAppContext();
  const sent = await myFeedbackCounts(ctx.user.id);

  return (
    <PageContainer width="list">
      <PageHeader title="データとその他" />
      <SettingsBack />

      <div className="space-y-6">
        <ListGroup title="ご意見・不具合のご報告" padded>
          <FeedbackEntry
            defaultEmail={ctx.user.email}
            sentCount={sent.total}
            repliedCount={sent.replied}
          />
        </ListGroup>

        <ListGroup title="データ（CSV）" padded>
          <DataTools isPro={tierAtLeast(ctx.tier, "PRO")} />
        </ListGroup>

        <ListGroup title="ベータ機能" padded>
          <BetaFeaturesToggle
            enabled={ctx.betaOptIn}
            features={enabledBetaFeatures({
              optIn: ctx.betaOptIn,
              features: ctx.user.betaFeatures,
            })}
          />
        </ListGroup>

        <ListGroup title="取り消せない操作" padded bodyClassName="space-y-4">
          {ctx.role === "OWNER" && <DeleteAllData />}
          <div className={ctx.role === "OWNER" ? "border-t border-border-subtle pt-4" : ""}>
            <DangerZone />
          </div>
        </ListGroup>
      </div>
    </PageContainer>
  );
}
