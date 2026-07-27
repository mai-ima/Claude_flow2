import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { userDetail } from "@/modules/admin/queries";
import { formatDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { pageMetadata } from "@/lib/seo";
import { ADMIN_ROLE_LABEL, effectiveAdminRole, hasAdminRole } from "@/lib/admin-role";
import { Badge } from "@/components/ui/badge";
import { ExportUserButton } from "@/modules/admin/components/export-user-button";

export const metadata: Metadata = pageMetadata({ title: "ユーザー詳細", noindex: true });

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 border-t border-border-subtle px-4 py-2.5 text-[13px] first:border-t-0">
      <span className="w-32 shrink-0 text-text-tertiary">{label}</span>
      <span className="min-w-0 flex-1 break-all">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
        {children}
      </div>
    </section>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const detail = await userDetail(id);
  if (!detail) notFound();

  const { user, counts, audits } = detail;
  const canExport = hasAdminRole(effectiveAdminRole(admin.adminRole, admin.isAdmin), "SUPER");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-[13px] font-medium text-accent">
          ← ユーザー一覧
        </Link>
        <h1 className="mt-2 flex flex-wrap items-center gap-2 text-[24px] font-bold tracking-[-0.02em]">
          {user.name ?? "（名前なし）"}
          {user.adminRole !== "NONE" && (
            <Badge tone="pod" size="sm">
              {ADMIN_ROLE_LABEL[effectiveAdminRole(user.adminRole, user.isAdmin)]}
            </Badge>
          )}
          {user.suspendedAt && (
            <Badge tone="expense" size="sm">
              凍結中
            </Badge>
          )}
        </h1>
        <p className="mt-1 text-[14px] text-text-secondary">{user.email}</p>
      </div>

      <Section title="基本情報">
        <Row label="登録日" value={formatDate(user.createdAt, "yyyy/M/d HH:mm")} />
        <Row label="プラン" value={user.billing?.tier ?? "FREE"} />
        <Row label="取引数" value={`${counts.transactions.toLocaleString("ja-JP")}件`} />
        <Row label="サブスク数" value={`${counts.subscriptions.toLocaleString("ja-JP")}件`} />
        {user.suspendedAt && (
          <Row
            label="凍結"
            value={`${formatDate(user.suspendedAt, "yyyy/M/d HH:mm")} ・ ${user.suspendedReason ?? "理由なし"}`}
          />
        )}
      </Section>

      <Section title="所属している帳簿">
        {user.memberships.length === 0 ? (
          <Row label="" value="ありません" />
        ) : (
          user.memberships.map((m) => (
            <Row
              key={m.id}
              label={m.ledger.type === "POD" ? "共有帳簿" : "個人帳簿"}
              value={
                <>
                  {m.ledger.name}
                  <span className="ml-2 text-text-tertiary">
                    {m.ledger.ownerId === user.id ? "オーナー" : m.role === "EDITOR" ? "編集可" : "閲覧のみ"}
                  </span>
                </>
              }
            />
          ))
        )}
      </Section>

      <Section title="ログイン中の端末">
        {user.sessions.length === 0 ? (
          <Row label="" value="ありません" />
        ) : (
          user.sessions.map((s) => (
            <Row
              key={s.id}
              label={formatDate(s.lastUsedAt, "M/d HH:mm")}
              value={
                <>
                  {s.ip ?? "IP不明"} ・ {s.userAgent?.slice(0, 60) ?? "端末不明"}
                  {s.impersonatedBy && (
                    <span className="ml-2 text-warning">（管理者による閲覧）</span>
                  )}
                </>
              }
            />
          ))
        )}
      </Section>

      <Section title="最近の通知">
        {user.notifications.length === 0 ? (
          <Row label="" value="ありません" />
        ) : (
          user.notifications.map((n) => (
            <Row key={n.id} label={formatDate(n.createdAt, "M/d")} value={`${n.title} — ${n.body}`} />
          ))
        )}
      </Section>

      <Section title="このユーザーに対する管理操作">
        {audits.length === 0 ? (
          <Row label="" value="ありません" />
        ) : (
          audits.map((a) => (
            <Row
              key={a.id}
              label={formatDate(a.createdAt, "M/d HH:mm")}
              value={
                <>
                  {a.action} ・ {a.actorEmail}
                  {a.reason && <span className="ml-2 text-text-tertiary">（{a.reason}）</span>}
                </>
              }
            />
          ))
        )}
      </Section>

      {canExport && (
        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold">データの書き出し</h2>
          <p className="text-[13px] text-text-secondary">
            開示請求・サポート対応向けに、このユーザーの全データを JSON で取得します。実行は監査ログに残ります。
          </p>
          <ExportUserButton userId={user.id} email={user.email} />
        </section>
      )}

      <p className="text-[12px] text-text-tertiary">
        合計残高などの金額は帳簿ごとの表示通貨で計算されます（例: {formatMoney(0)}）。
      </p>
    </div>
  );
}
