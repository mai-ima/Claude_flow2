import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import {
  listCronRuns,
  recentCronFailures,
  listEmailLogs,
  listErrorEvents,
  dataVolume,
} from "@/modules/admin/queries";
import { formatDate } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";
import { effectiveAdminRole, hasAdminRole } from "@/lib/admin-role";
import { RunCronButton } from "@/modules/admin/components/run-cron-button";

export const metadata: Metadata = pageMetadata({ title: "運用", noindex: true });

const STATUS_LABEL: Record<string, string> = {
  RUNNING: "実行中",
  SUCCESS: "成功",
  FAILED: "失敗",
  SENT: "送信済み",
  SKIPPED: "送信せず",
};

const STATUS_TONE: Record<string, string> = {
  SUCCESS: "text-income",
  SENT: "text-income",
  FAILED: "text-expense",
  RUNNING: "text-warning",
  SKIPPED: "text-text-tertiary",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminOpsPage() {
  const admin = await requireAdmin();
  const canRun = hasAdminRole(effectiveAdminRole(admin.adminRole, admin.isAdmin), "SUPER");

  const [runs, failures, emails, errors, volume] = await Promise.all([
    listCronRuns(20),
    recentCronFailures(48),
    listEmailLogs({ limit: 20 }),
    listErrorEvents(20),
    dataVolume(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">運用</h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          毎日の自動処理・メール送信・エラー・データ量の状況です。
        </p>
      </div>

      {failures > 0 && (
        <p role="alert" className="rounded-xl border border-expense/30 bg-expense/5 px-4 py-3 text-[14px] text-expense">
          直近48時間で自動処理が {failures} 回失敗しています。下の履歴で内容を確認してください。
        </p>
      )}

      <Section title="自動処理の履歴">
        {canRun && <RunCronButton />}
        {runs.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-text-secondary">
            まだ実行されていません。
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
            {runs.map((r) => (
              <div key={r.id} className="border-t border-border-subtle px-4 py-3 text-[13px] first:border-t-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{r.job}</span>
                  <span className={STATUS_TONE[r.status] ?? ""}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span className="text-text-tertiary">
                    {r.trigger === "MANUAL" ? "手動" : "定期"}
                  </span>
                  <span className="ml-auto tabular-nums text-text-tertiary">
                    {formatDate(r.startedAt, "M/d HH:mm")}
                    {r.endedAt
                      ? ` ・ ${Math.round((r.endedAt.getTime() - r.startedAt.getTime()) / 100) / 10}秒`
                      : ""}
                  </span>
                </div>
                {r.error && <div className="mt-1 break-all text-expense">{r.error}</div>}
                {r.result != null && (
                  <div className="mt-1 break-all font-mono text-[12px] text-text-secondary">
                    {JSON.stringify(r.result)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="エラー">
        {errors.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-text-secondary">
            記録されたエラーはありません。
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
            {errors.map((e) => (
              <div key={e.id} className="border-t border-border-subtle px-4 py-3 text-[13px] first:border-t-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{e.message}</span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] tabular-nums">
                    {e.count}回
                  </span>
                  <span className="ml-auto tabular-nums text-text-tertiary">
                    {formatDate(e.lastSeen, "M/d HH:mm")}
                  </span>
                </div>
                {e.stack && (
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-text-tertiary">
                    {e.stack.split("\n").slice(0, 3).join("\n")}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="メール送信">
        {emails.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-text-secondary">
            送信の記録はありません。
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
            {emails.map((m) => (
              <div key={m.id} className="flex flex-wrap items-baseline gap-x-2 border-t border-border-subtle px-4 py-2.5 text-[13px] first:border-t-0">
                <span className={STATUS_TONE[m.status] ?? ""}>
                  {STATUS_LABEL[m.status] ?? m.status}
                </span>
                <span className="truncate">{m.to}</span>
                <span className="truncate text-text-tertiary">{m.subject}</span>
                <span className="ml-auto tabular-nums text-text-tertiary">
                  {formatDate(m.createdAt, "M/d HH:mm")}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="データ量">
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
          {volume.rows.map((r) => (
            <div key={r.name} className="flex items-baseline gap-3 border-t border-border-subtle px-4 py-2.5 text-[13px] first:border-t-0">
              <span className="flex-1">{r.name}</span>
              <span className="tabular-nums font-medium">{r.total.toLocaleString("ja-JP")}</span>
              {r.added !== null && (
                <span className="w-28 text-right tabular-nums text-text-tertiary">
                  30日で +{r.added.toLocaleString("ja-JP")}
                </span>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
