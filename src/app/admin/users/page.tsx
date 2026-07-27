import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { searchUsers, countUsers } from "@/modules/admin/queries";
import { AdminUsersTable, type AdminUser } from "@/modules/admin/components/admin-users-table";
import { formatDate } from "@/lib/date";
import { effectiveAdminRole, hasAdminRole } from "@/lib/admin-role";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "ユーザー管理", noindex: true });

type SP = { q?: string; tier?: string; filter?: string; cursor?: string };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const role = effectiveAdminRole(admin.adminRole, admin.isAdmin);

  const [{ users, nextCursor }, total] = await Promise.all([
    searchUsers({
      q: sp.q,
      tier: sp.tier || undefined,
      adminOnly: sp.filter === "admin",
      suspendedOnly: sp.filter === "suspended",
      cursor: sp.cursor,
      limit: 50,
    }),
    countUsers(),
  ]);

  const rows: AdminUser[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    isAdmin: u.isAdmin,
    adminRole: u.adminRole,
    suspended: u.suspendedAt !== null,
    tier: u.tier,
    ledgers: u.ledgers,
    createdLabel: formatDate(u.createdAt, "yyyy/M/d"),
  }));

  // ページ送りのリンクは、いまの絞り込みを保ったまま cursor だけ差し替える。
  const nextParams = new URLSearchParams();
  if (sp.q) nextParams.set("q", sp.q);
  if (sp.tier) nextParams.set("tier", sp.tier);
  if (sp.filter) nextParams.set("filter", sp.filter);
  if (nextCursor) nextParams.set("cursor", nextCursor);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">ユーザー管理</h1>
        <p className="mt-1 text-[14px] text-text-secondary">全{total}件</p>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="メール・名前で検索"
          aria-label="メール・名前で検索"
          className="h-10 min-w-0 flex-1 rounded-xl border border-border-subtle bg-surface-1 px-3 text-[14px]"
        />
        <select
          name="tier"
          defaultValue={sp.tier ?? ""}
          aria-label="プランで絞り込む"
          className="h-10 rounded-xl border border-border-subtle bg-surface-1 px-3 text-[14px]"
        >
          <option value="">すべてのプラン</option>
          <option value="FREE">FREE</option>
          <option value="PLUS">PLUS</option>
          <option value="PRO">PRO</option>
        </select>
        <select
          name="filter"
          defaultValue={sp.filter ?? ""}
          aria-label="状態で絞り込む"
          className="h-10 rounded-xl border border-border-subtle bg-surface-1 px-3 text-[14px]"
        >
          <option value="">すべての状態</option>
          <option value="admin">管理者のみ</option>
          <option value="suspended">凍結中のみ</option>
        </select>
        <button
          type="submit"
          className="h-10 shrink-0 rounded-xl bg-accent-solid px-4 text-[14px] font-medium text-white"
        >
          検索
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-10 text-center text-[14px] text-text-secondary">
          該当するユーザーはいません。
        </p>
      ) : (
        <AdminUsersTable
          users={rows}
          selfId={admin.id}
          canEdit={hasAdminRole(role, "SUPER")}
          canImpersonate={hasAdminRole(role, "SUPPORT")}
        />
      )}

      {nextCursor && (
        <Link
          href={`/admin/users?${nextParams.toString()}`}
          className="block rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-center text-[14px] font-medium text-accent"
        >
          次の50件を表示
        </Link>
      )}
    </div>
  );
}
