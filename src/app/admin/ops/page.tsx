import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import {
  listCronRuns,
  cronJobs,
  recentCronFailures,
  listEmailLogs,
  listErrorEvents,
  logCounts,
  dataVolume,
} from "@/modules/admin/queries";
import { formatDate } from "@/lib/date";
import { pageMetadata } from "@/lib/seo";
import { effectiveAdminRole, hasAdminRole } from "@/lib/admin-role";
import { RunCronButton } from "@/modules/admin/components/run-cron-button";
import { LogSection, type LogItem } from "@/modules/admin/components/log-section";

export const metadata: Metadata = pageMetadata({ title: "運用", noindex: true });

const STATUS_LABEL: Record<string, string> = {
  RUNNING: "実行中",
  SUCCESS: "成功",
  FAILED: "失敗",
  SENT: "送信済み",
  SKIPPED: "送信せず",
};

const TONE: Record<string, LogItem["tone"]> = {
  SUCCESS: "ok",
  SENT: "ok",
  FAILED: "bad",
  RUNNING: "warn",
  SKIPPED: "muted",
};

const EMAIL_KIND_LABEL: Record<string, string> = {
  REMINDER: "お知らせ",
  CONTACT: "問い合わせ",
  VERIFY: "メール確認",
  RESET: "パスワード再設定",
  BROADCAST: "一斉配信",
  FEEDBACK: "ご意見への返信",
};

/** 表示件数。多すぎると読む気が失せ、少なすぎると調べられない。 */
const SHOW = 30;

function seconds(started: Date, ended: Date | null): string {
  if (!ended) return "";
  return ` ・ ${Math.round((ended.getTime() - started.getTime()) / 100) / 10}秒`;
}

export default async function AdminOpsPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; cs?: string; ek?: string; es?: string }>;
}) {
  const admin = await requireAdmin();
  const role = effectiveAdminRole(admin.adminRole, admin.isAdmin);
  const canRun = hasAdminRole(role, "SUPER");
  const sp = await searchParams;

  const [runs, jobs, failures, emails, errors, counts, volume] = await Promise.all([
    listCronRuns({ job: sp.job || undefined, status: sp.cs || undefined, limit: SHOW }),
    cronJobs(),
    recentCronFailures(48),
    listEmailLogs({ kind: sp.ek || undefined, status: sp.es || undefined, limit: SHOW }),
    listErrorEvents(SHOW),
    logCounts(),
    dataVolume(),
  ]);

  const cronItems: LogItem[] = runs.map((r) => ({
    id: r.id,
    title: r.job,
    status: STATUS_LABEL[r.status] ?? r.status,
    tone: TONE[r.status],
    chips: [r.trigger === "MANUAL" ? "手動" : "定期"],
    time: formatDate(r.startedAt, "M/d HH:mm") + seconds(r.startedAt, r.endedAt),
    note: r.error ?? undefined,
    detail: r.result != null ? JSON.stringify(r.result) : undefined,
  }));

  const errorItems: LogItem[] = errors.map((e) => ({
    id: e.id,
    title: e.message,
    status: `${e.count}回`,
    tone: "bad",
    time: formatDate(e.lastSeen, "M/d HH:mm"),
    detail: e.stack ? e.stack.split("\n").slice(0, 3).join("\n") : undefined,
  }));

  const emailItems: LogItem[] = emails.map((m) => ({
    id: m.id,
    title: m.to,
    status: STATUS_LABEL[m.status] ?? m.status,
    tone: TONE[m.status],
    chips: [EMAIL_KIND_LABEL[m.kind] ?? m.kind],
    time: formatDate(m.createdAt, "M/d HH:mm"),
    sub: m.subject,
    note: m.error ?? undefined,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">運用</h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          毎日の自動処理・メール送信・エラー・データ量の状況です。
          {canRun && "　記録が増えすぎたときは、各見出しの「まとめて削除」から片付けられます。"}
        </p>
      </div>

      {failures > 0 && (
        <p
          role="alert"
          className="rounded-xl border border-expense/30 bg-expense/5 px-4 py-3 text-[14px] text-expense"
        >
          直近48時間で自動処理が {failures} 回失敗しています。下の履歴で内容を確認してください。
        </p>
      )}

      <div className="space-y-3">
        <form className="flex flex-wrap gap-2" method="get">
          {/* 別のセクションの絞り込みを消さない。片方を変えるともう片方が
              全件に戻ると、行き来しながら調べられない。 */}
          {sp.ek && <input type="hidden" name="ek" value={sp.ek} />}
          {sp.es && <input type="hidden" name="es" value={sp.es} />}
          <select
            name="job"
            defaultValue={sp.job ?? ""}
            aria-label="ジョブで絞り込む"
            className="h-10 rounded-xl border border-border-subtle bg-surface-1 px-3 text-[14px]"
          >
            <option value="">すべてのジョブ</option>
            {jobs.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
          <select
            name="cs"
            defaultValue={sp.cs ?? ""}
            aria-label="実行結果で絞り込む"
            className="h-10 rounded-xl border border-border-subtle bg-surface-1 px-3 text-[14px]"
          >
            <option value="">すべての結果</option>
            {["SUCCESS", "FAILED", "RUNNING"].map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
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
          title="自動処理の履歴"
          kind="CRON"
          items={cronItems}
          total={counts.cron}
          canPurge={canRun}
          emptyText={
            sp.job || sp.cs ? "この条件に当てはまる実行はありません。" : "まだ実行されていません。"
          }
        >
          {canRun && <RunCronButton />}
        </LogSection>
      </div>

      <LogSection
        title="エラー"
        description="同じ内容はまとめて1行にし、発生回数で数えています。"
        kind="ERROR"
        items={errorItems}
        total={counts.error}
        canPurge={canRun}
        emptyText="記録されたエラーはありません。"
      />

      <div className="space-y-3">
        <form className="flex flex-wrap gap-2" method="get">
          {sp.job && <input type="hidden" name="job" value={sp.job} />}
          {sp.cs && <input type="hidden" name="cs" value={sp.cs} />}
          <select
            name="ek"
            defaultValue={sp.ek ?? ""}
            aria-label="メールの種類で絞り込む"
            className="h-10 rounded-xl border border-border-subtle bg-surface-1 px-3 text-[14px]"
          >
            <option value="">すべての種類</option>
            {Object.entries(EMAIL_KIND_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <select
            name="es"
            defaultValue={sp.es ?? ""}
            aria-label="送信結果で絞り込む"
            className="h-10 rounded-xl border border-border-subtle bg-surface-1 px-3 text-[14px]"
          >
            <option value="">すべての結果</option>
            {["SENT", "SKIPPED", "FAILED"].map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
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
          title="メール送信"
          kind="EMAIL"
          items={emailItems}
          total={counts.email}
          canPurge={canRun}
          emptyText={
            sp.ek || sp.es ? "この条件に当てはまる送信はありません。" : "送信の記録はありません。"
          }
        />
      </div>

      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold">データ量</h2>
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
          {volume.rows.map((r) => (
            <div
              key={r.name}
              className="flex items-baseline gap-3 border-t border-border-subtle px-4 py-2.5 text-[13px] first:border-t-0"
            >
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
      </section>
    </div>
  );
}
