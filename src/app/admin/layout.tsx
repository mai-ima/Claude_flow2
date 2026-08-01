import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ShieldIcon } from "@/components/icons";
import { effectiveAdminRole, hasAdminRole, ADMIN_ROLE_LABEL } from "@/lib/admin-role";
import { AdminNav } from "@/modules/admin/components/admin-nav";
import { openFeedbackCount } from "@/modules/feedback/queries";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  // 閲覧権限があれば入れる。変更できるかは各操作側で判定する。
  if (!hasAdminRole(effectiveAdminRole(user.adminRole, user.isAdmin), "READONLY")) {
    redirect("/dashboard");
  }

  // 手つかずの報告があることは、どの画面にいても分かるようにする。
  // 「ご意見」を開かないと気づけないと、届いた声が放置される。
  const openFeedback = await openFeedbackCount();

  return (
    <div className="min-h-screen bg-surface-0">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-glass backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-5">
          <div className="flex shrink-0 items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-pod text-white">
              <ShieldIcon size={18} />
            </span>
            <span className="text-[16px]">管理コンソール</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
              {ADMIN_ROLE_LABEL[effectiveAdminRole(user.adminRole, user.isAdmin)]}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <AdminNav openFeedback={openFeedback} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
