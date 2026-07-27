import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listUsers, countUsers } from "@/modules/admin/queries";
import { AdminUsersTable, type AdminUser } from "@/modules/admin/components/admin-users-table";
import { formatDate } from "@/lib/date";
import { effectiveAdminRole, hasAdminRole } from "@/lib/admin-role";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "ユーザー管理", noindex: true });

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const LIMIT = 200;
  const [users, total] = await Promise.all([listUsers(LIMIT), countUsers()]);

  const rows: AdminUser[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    isAdmin: u.isAdmin,
    adminRole: u.adminRole,
    tier: u.tier,
    ledgers: u.ledgers,
    createdLabel: formatDate(u.createdAt, "yyyy/M/d"),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">ユーザー管理</h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          全{total}件
          {total > rows.length && `（新しい ${rows.length} 件を表示）`}
          。プラン変更・管理者権限・削除ができます。
        </p>
      </div>
      <AdminUsersTable
        users={rows}
        selfId={admin.id}
        canEdit={hasAdminRole(effectiveAdminRole(admin.adminRole, admin.isAdmin), "SUPER")}
      />
    </div>
  );
}
