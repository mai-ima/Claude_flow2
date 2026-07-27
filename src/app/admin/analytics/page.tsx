import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import {
  activeUsers,
  signupTrend,
  retentionCohorts,
  featureUsage,
  revenueStats,
  contentStats,
} from "@/modules/admin/queries";
import { formatMoney } from "@/lib/money";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "分析", noindex: true });

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-3">
      <div className="text-[12px] text-text-tertiary">{label}</div>
      <div className="mt-0.5 text-[22px] font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-text-tertiary">{hint}</div>}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {note && <p className="text-[12px] text-text-tertiary">{note}</p>}
      {children}
    </section>
  );
}

/** 棒グラフ相当の横バー。ライブラリを足さずに済ませる。 */
function Bar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3 border-t border-border-subtle px-4 py-2 text-[13px] first:border-t-0">
      <span className="w-40 shrink-0 truncate">{label}</span>
      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-24 shrink-0 text-right tabular-nums">
        {value.toLocaleString("ja-JP")}
        {suffix ?? ""}
      </span>
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const [active, signups, cohorts, features, revenue, content] = await Promise.all([
    activeUsers(),
    signupTrend(30),
    retentionCohorts(6),
    featureUsage(),
    revenueStats(),
    contentStats(),
  ]);

  const maxSignup = Math.max(1, ...signups.map((s) => s.count));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">分析</h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          利用状況・継続・収益の推移です。すべて既存のデータから算出しています。
        </p>
      </div>

      <Section title="アクティブユーザー" note="セッションの最終利用時刻を基準に数えています。">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="DAU（24時間）" value={active.dau.toLocaleString("ja-JP")} />
          <Stat label="WAU（7日）" value={active.wau.toLocaleString("ja-JP")} />
          <Stat label="MAU（30日）" value={active.mau.toLocaleString("ja-JP")} />
        </div>
      </Section>

      <Section title="収益">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="MRR" value={formatMoney(revenue.mrr)} />
          <Stat label="ARR" value={formatMoney(revenue.arr)} />
          <Stat label="ARPU" value={formatMoney(revenue.arpu)} hint="全ユーザーあたり" />
          <Stat
            label="解約予告中"
            value={`${revenue.cancelling}件`}
            hint="期末で解約になる契約"
          />
        </div>
        <div className="mt-2 overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
          <Bar label="フリー" value={revenue.free} max={Math.max(1, revenue.free)} suffix="人" />
          <Bar label="プラス" value={revenue.plus} max={Math.max(1, revenue.free)} suffix="人" />
          <Bar label="プロ" value={revenue.pro} max={Math.max(1, revenue.free)} suffix="人" />
        </div>
        <p className="text-[12px] text-text-tertiary">有料率 {revenue.payingRatio}%</p>
      </Section>

      <Section title="新規登録（30日）">
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
          <div className="flex h-32 items-end gap-px px-4 py-3">
            {signups.map((s) => (
              <span
                key={s.date}
                title={`${s.date}: ${s.count}人`}
                className="min-w-0 flex-1 rounded-t bg-accent"
                style={{ height: `${Math.max(2, (s.count / maxSignup) * 100)}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between border-t border-border-subtle px-4 py-2 text-[12px] text-text-tertiary">
            <span>{signups[0]?.date}</span>
            <span>合計 {signups.reduce((a, s) => a + s.count, 0)}人</span>
            <span>{signups[signups.length - 1]?.date}</span>
          </div>
        </div>
      </Section>

      <Section
        title="継続率コホート"
        note="登録した週ごとに、1日後・7日後・30日後まで使い続けた人の割合です。"
      >
        {cohorts.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-text-secondary">
            まだデータがありません。
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface-1">
            <table className="w-full min-w-[420px] text-[13px]">
              <thead>
                <tr className="border-b border-border-subtle text-text-tertiary">
                  <th className="px-4 py-2 text-left font-medium">登録週</th>
                  <th className="px-4 py-2 text-right font-medium">人数</th>
                  <th className="px-4 py-2 text-right font-medium">1日後</th>
                  <th className="px-4 py-2 text-right font-medium">7日後</th>
                  <th className="px-4 py-2 text-right font-medium">30日後</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => {
                  const pct = (n: number) => (c.total === 0 ? "—" : `${Math.round((n / c.total) * 100)}%`);
                  return (
                    <tr key={c.week} className="border-b border-border-subtle last:border-b-0">
                      <td className="px-4 py-2">{c.week}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.total}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{pct(c.d1)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{pct(c.d7)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{pct(c.d30)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="機能の利用状況" note={`全${features.total}人のうち、その機能を使っている人の割合です。`}>
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
          {features.rows.map((r) => (
            <Bar key={r.name} label={r.name} value={r.count} max={Math.max(1, features.total)} suffix={`人 (${r.pct}%)`} />
          ))}
        </div>
      </Section>

      <Section title="帳簿の状況">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="帳簿数" value={content.ledgers.toLocaleString("ja-JP")} />
          <Stat label="共有帳簿" value={`${content.pods}件`} hint={`全体の ${content.podRatio}%`} />
          <Stat
            label="最多メンバー数"
            value={`${content.memberDistribution.at(-1)?.members ?? 0}人`}
          />
        </div>
        <div className="mt-2 overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
          {content.bands.map((b) => (
            <Bar
              key={b.name}
              label={`取引 ${b.name}`}
              value={b.count}
              max={Math.max(1, ...content.bands.map((x) => x.count))}
              suffix="帳簿"
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
