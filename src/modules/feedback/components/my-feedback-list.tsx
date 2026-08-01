import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FlagIcon } from "@/components/icons";
import { FEEDBACK_KIND_LABEL, FEEDBACK_STATUS_LABEL, type FeedbackKind, type FeedbackStatus } from "../schema";

export interface MyFeedbackRow {
  id: string;
  kind: string;
  body: string;
  status: string;
  fromPath: string | null;
  replyBody: string | null;
  repliedAtLabel: string | null;
  createdAtLabel: string;
}

/**
 * 自分が送った報告の一覧。
 *
 * 状態をそのまま見せる。「見送り」も隠さない。送ったものがどう扱われたか
 * 分からないまま放置されるより、見送りと分かるほうが納得できる。
 */
export function MyFeedbackList({ rows }: { rows: MyFeedbackRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<FlagIcon size={28} />}
        title="まだ送っていません"
        description="うまく動かないところや、こうしてほしいという要望をお送りいただけます。"
      />
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={r.kind === "BUG" ? "expense" : "accent"} size="sm">
              {FEEDBACK_KIND_LABEL[r.kind as FeedbackKind] ?? r.kind}
            </Badge>
            <Badge
              tone={r.status === "NEW" ? "warning" : r.status === "DONE" ? "income" : "neutral"}
              size="sm"
            >
              {FEEDBACK_STATUS_LABEL[r.status as FeedbackStatus] ?? r.status}
            </Badge>
            <span className="ml-auto text-[12px] text-text-tertiary">{r.createdAtLabel}</span>
          </div>

          <p className="mt-2.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed">
            {r.body}
          </p>

          {r.fromPath && (
            <p className="mt-1.5 text-[11px] text-text-tertiary">送信元の画面: {r.fromPath}</p>
          )}

          {r.replyBody && (
            <div className="mt-3 rounded-xl border border-accent/25 bg-accent/5 px-3.5 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] font-semibold text-accent">開発からの返信</span>
                {r.repliedAtLabel && (
                  <span className="text-[11px] text-text-tertiary">{r.repliedAtLabel}</span>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                {r.replyBody}
              </p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
