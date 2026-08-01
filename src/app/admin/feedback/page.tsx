import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { effectiveAdminRole, hasAdminRole } from "@/lib/admin-role";
import { listFeedback, feedbackCounts } from "@/modules/feedback/queries";
import {
  FeedbackTable,
  FEEDBACK_KIND_LABEL,
  type FeedbackRow,
  type FeedbackKind,
} from "@/modules/feedback";
import { formatDate } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "ご意見・不具合", noindex: true });

const KINDS: FeedbackKind[] = ["BUG", "REQUEST", "OTHER"];

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string }>;
}) {
  const admin = await requireAdmin("READONLY");
  const sp = await searchParams;
  const kind = KINDS.includes(sp.kind as FeedbackKind) ? (sp.kind as FeedbackKind) : undefined;

  const [rows, counts] = await Promise.all([
    listFeedback({ q: sp.q?.trim() || undefined, kind }),
    feedbackCounts(),
  ]);

  const items: FeedbackRow[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    body: r.body,
    contactEmail: r.contactEmail,
    fromPath: r.fromPath,
    userAgent: r.userAgent,
    appVersion: r.appVersion,
    status: r.status,
    adminNote: r.adminNote,
    replyBody: r.replyBody,
    repliedAtLabel: r.repliedAt ? formatDate(r.repliedAt, "M月d日 HH:mm") : null,
    handledByName: r.handledBy?.name ?? r.handledBy?.email ?? null,
    handledAtLabel: r.handledAt ? formatDate(r.handledAt, "M月d日 HH:mm") : null,
    // 退会すると userId が null になる。名前が引けないだけで報告は残る。
    userName: r.userId === null ? null : (r.user?.name ?? null),
    userEmail: r.userId === null ? null : (r.user?.email ?? null),
    createdAtLabel: formatDate(r.createdAt, "M月d日 HH:mm"),
  }));

  return (
    <div>
      <h1 className="mb-1 text-[24px] font-bold tracking-tight">ご意見・不具合</h1>
      <p className="mb-4 text-[13px] text-text-secondary">
        利用者が設定から送ったものが届きます。本文はそのまま出しています。
        返信すると、送り主のアプリ内通知と（返信先が入力されていれば）メールに届きます。
      </p>

      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="本文・メール・画面で探す"
          aria-label="本文やメールアドレスで探す"
          className="h-10 min-w-0 flex-1 rounded-xl border border-border-subtle bg-surface-1 px-3 text-[14px]"
        />
        <select
          name="kind"
          defaultValue={kind ?? ""}
          aria-label="種類で絞り込む"
          className="h-10 rounded-xl border border-border-subtle bg-surface-1 px-3 text-[14px]"
        >
          <option value="">すべての種類</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {FEEDBACK_KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 shrink-0 rounded-xl bg-accent-solid px-4 text-[14px] font-medium text-white"
        >
          探す
        </button>
      </form>

      {(sp.q || kind) && (
        <p className="mb-3 text-[12px] text-text-tertiary">
          {items.length}件が見つかりました。
          {/* 状態の内訳カードは全体の数。絞り込み中は数が合わないので断っておく。 */}
          下の内訳は全体の件数です。
        </p>
      )}

      <FeedbackTable
        rows={items}
        counts={counts}
        canDelete={hasAdminRole(effectiveAdminRole(admin.adminRole, admin.isAdmin), "SUPER")}
      />
    </div>
  );
}
