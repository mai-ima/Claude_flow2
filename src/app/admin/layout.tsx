import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ShieldIcon, ChartIcon, UsersIcon, LogoutIcon, ClockIcon, BoltIcon, SparklesIcon, BellIcon, SlidersIcon, CardIcon } from "@/components/icons";
import { effectiveAdminRole, hasAdminRole, ADMIN_ROLE_LABEL } from "@/lib/admin-role";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  // 閲覧権限があれば入れる。変更できるかは各操作側で判定する。
  if (!hasAdminRole(effectiveAdminRole(user.adminRole, user.isAdmin), "READONLY")) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-surface-0">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-glass backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-pod text-white">
              <ShieldIcon size={18} />
            </span>
            <span className="text-[16px]">管理コンソール</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
              {ADMIN_ROLE_LABEL[effectiveAdminRole(user.adminRole, user.isAdmin)]}
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
            >
              <ChartIcon size={17} /> 概要
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
            >
              <UsersIcon size={17} /> ユーザー
            </Link>
            <Link
              href="/admin/analytics"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
            >
              <SparklesIcon size={17} /> 分析
            </Link>
            <Link
              href="/admin/ops"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
            >
              <BoltIcon size={17} /> 運用
            </Link>
            <Link
              href="/admin/billing"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
            >
              <CardIcon size={17} /> 課金
            </Link>
            <Link
              href="/admin/content"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
            >
              <BellIcon size={17} /> 配信
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
            >
              <SlidersIcon size={17} /> 設定
            </Link>
            <Link
              href="/admin/audit"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
            >
              <ClockIcon size={17} /> 監査ログ
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
            >
              <LogoutIcon size={17} /> アプリへ
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
