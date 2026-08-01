import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { effectiveAdminRole, hasAdminRole } from "@/lib/admin-role";
import { listFeedback, feedbackCounts } from "@/modules/feedback/queries";
import { FeedbackTable, type FeedbackRow } from "@/modules/feedback";
import { formatDate } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "ご意見・不具合", noindex: true });

export default async function AdminFeedbackPage() {
  const admin = await requireAdmin("READONLY");
  const [rows, counts] = await Promise.all([listFeedback(), feedbackCounts()]);

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
      <p className="mb-5 text-[13px] text-text-secondary">
        利用者が設定から送ったものが届きます。本文はそのまま出しています。
      </p>
      <FeedbackTable
        rows={items}
        counts={counts}
        canDelete={hasAdminRole(effectiveAdminRole(admin.adminRole, admin.isAdmin), "SUPER")}
      />
    </div>
  );
}
