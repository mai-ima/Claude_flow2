import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { ListGroup } from "@/components/ui/list";
import { SettingsBack } from "@/modules/account";
import { FeedbackEntry, MyFeedbackList, type MyFeedbackRow } from "@/modules/feedback";
import { myFeedback } from "@/modules/feedback/queries";
import { formatDate } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "送ったご報告", noindex: true });

/**
 * 自分が送った報告と、その返信。
 *
 * 送ったあと何も返らないと、次から送ってもらえなくなる。
 * 状態と返信を、送った本人がいつでも見られる場所に置く。
 */
export default async function MyFeedbackPage() {
  const ctx = await getAppContext();
  const rows = await myFeedback(ctx.user.id);

  const items: MyFeedbackRow[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    body: r.body,
    status: r.status,
    fromPath: r.fromPath,
    replyBody: r.replyBody,
    repliedAtLabel: r.repliedAt ? formatDate(r.repliedAt, "M月d日 HH:mm") : null,
    createdAtLabel: formatDate(r.createdAt, "yyyy年M月d日 HH:mm"),
  }));

  return (
    <PageContainer width="list">
      <PageHeader title="送ったご報告" />
      <SettingsBack />

      <div className="space-y-6">
        <ListGroup title="新しく送る" padded>
          <FeedbackEntry defaultEmail={ctx.user.email} />
        </ListGroup>

        <div>
          <div className="mb-2 px-1 text-[13px] font-semibold text-text-secondary">
            これまでに送ったもの
          </div>
          <MyFeedbackList rows={items} />
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-text-tertiary">
            対応状況は開発側で更新しています。「見送り」は、いただいた内容を検討したうえで
            今回は取り入れないと判断したものです。
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
