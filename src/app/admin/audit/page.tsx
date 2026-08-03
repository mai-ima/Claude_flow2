import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listAuditLogs, auditActions, logCounts } from "@/modules/admin/queries";
import { formatDate } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";
import { effectiveAdminRole, hasAdminRole } from "@/lib/admin-role";
import { LogSection, type LogItem } from "@/modules/admin/components/log-section";

export const metadata: Metadata = pageMetadata({ title: "監査ログ", noindex: true });

/** 操作名は英大文字のキーで保存している。画面には日本語で出す。 */
const ACTION_LABEL: Record<string, string> = {
  USER_TIER_CHANGE: "プラン変更",
  USER_ADMIN_ROLE_CHANGE: "管理権限の変更",
  USER_DELETE: "ユーザー削除",
  USER_SUSPEND: "アカウント凍結",
  USER_UNSUSPEND: "凍結の解除",
  USER_EXPORT: "データ書き出し",
  IMPERSONATE_START: "成りすまし開始",
  IMPERSONATE_END: "成りすまし終了",
  CRON_RUN_MANUAL: "定期処理の手動実行",
  EMAIL_RESEND: "メール再送",
  BROADCAST_SEND: "お知らせ配信",
  RELEASE_NOTE_PUBLISH: "リリースノート公開",
  FEATURE_FLAG_CHANGE: "機能フラグの変更",
  SYSTEM_SETTING_CHANGE: "システム設定の変更",
  STRIPE_SYNC: "Stripe との突合",
  LOG_PURGE: "ログの削除",
  FEEDBACK_REPLY: "ご意見への返信",
  FEEDBACK_DELETE: "ご意見の削除",
};

function summarize(before: unknown, after: unknown): string | null {
  const b = before as Record<string, unknown> | null;
  const a = after as Record<string, unknown> | null;
  if (!b && !a) return null;
  const keys = [...new Set([...Object.keys(b ?? {}), ...Object.keys(a ?? {})])];
  const parts = keys
    .filter((k) => JSON.stringify(b?.[k]) !== JSON.stringify(a?.[k]))
    .map((k) => `${k}: ${JSON.stringify(b?.[k]) ?? "—"} → ${JSON.stringify(a?.[k]) ?? "—"}`);
  return parts.length > 0 ? parts.join(" / ") : null;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; action?: string }>;
}) {
  const admin = await requireAdmin();
  const canPurge = hasAdminRole(effectiveAdminRole(admin.adminRole, admin.isAdmin), "SUPER");
  const sp = await searchParams;
  const [logs, actions, counts] = await Promise.all([
    listAuditLogs({ actorEmail: sp.actor?.trim() || undefined, action: sp.action || undefined }),
    auditActions(),
    logCounts(),
  ]);

  const items: LogItem[] = logs.map((l) => ({
    id: l.id,
    title: ACTION_LABEL[l.action] ?? l.action,
    status: l.targetLabel ?? l.targetType,
    tone: "muted",
    time: formatDate(l.createdAt, "yyyy/M/d HH:mm"),
    sub: `実行者: ${l.actorEmail}${l.ip ? ` ・ ${l.ip}` : ""}`,
    note: l.reason ? `理由: ${l.reason}` : undefined,
    detail: summarize(l.before, l.after) ?? undefined,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">監査ログ</h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          管理操作の証跡です。対象が削除されたあとも、誰が・いつ・何に・なぜ実行したかが残ります。
        </p>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input
          name="actor"
          defaultValue={sp.actor ?? ""}
          placeholder="実行者のメール"
          aria-label="実行者のメールで絞り込む"
          className="h-10 min-w-0 flex-1 rounded-xl border border-border-subtle bg-surface-1 px-3 text-[14px]"
        />
        <select
          name="action"
          defaultValue={sp.action ?? ""}
          aria-label="操作の種類で絞り込む"
          className="h-10 rounded-xl border border-border-subtle bg-surface-1 px-3 text-[14px]"
        >
          <option value="">すべての操作</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a] ?? a}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 shrink-0 rounded-xl bg-accent-solid px-4 text-[14px] font-medium text-white"
        >
          絞り込む
        </button>
      </form>

      <LogSection
        title="操作の記録"
        description="証跡として残すものであるため、1件ずつは削除できません。30日より古いものを、理由を添えてまとめて削除できます。削除できるのは最高責任者のみで、削除したこと自体も記録に残ります。"
        kind="AUDIT"
        items={items}
        total={counts.audit}
        canPurge={canPurge}
        emptyText="該当する記録はありません。"
      />
    </div>
  );
}
