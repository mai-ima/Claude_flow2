import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app/sidebar";
import { BottomBar } from "@/components/app/bottom-bar";
import { AppHeader, type LedgerOption } from "@/components/app/app-header";
import { AppChromeProvider } from "@/components/app/app-chrome";
import { CommandPalette } from "@/components/app/command-palette";
import { KeyboardShortcuts } from "@/components/app/keyboard-shortcuts";
import { getCurrentUser } from "@/lib/auth";
import { listUserLedgers, getActiveLedgerId } from "@/lib/ledger-access";
import {
  listNotifications,
  unreadCount,
} from "@/modules/notifications/queries";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/cn";
import { isBetaEnabled } from "@/lib/beta-features";
import { ImpersonationBanner } from "@/components/app/impersonation-banner";
import { AnnouncementBanner } from "@/components/app/announcement-banner";
import { MaintenanceScreen } from "@/components/app/maintenance-screen";
import { activeBanner } from "@/lib/announcements";
import { loadSettings } from "@/lib/settings";
import { effectiveAdminRole } from "@/lib/admin-role";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [ledgers, activeId, notifs, unread, banner, settings] = await Promise.all([
    listUserLedgers(user.id),
    getActiveLedgerId(user.id),
    listNotifications(user.id),
    unreadCount(user.id),
    activeBanner(user.tier),
    loadSettings(),
  ]);

  // メンテナンス中は管理者だけが通常画面に入れる。
  if (settings.maintenanceMode && effectiveAdminRole(user.adminRole, user.isAdmin) === "NONE") {
    return <MaintenanceScreen message={settings.maintenanceMessage} />;
  }

  const notifItems = notifs.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    href: n.href,
    read: n.readAt !== null,
    timeLabel: formatDate(n.createdAt, "M月d日"),
  }));

  const options: LedgerOption[] = ledgers.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    memberCount: l.members.length,
  }));
  const active = ledgers.find((l) => l.id === activeId);
  const isPod = active?.type === "POD";

  return (
    <>
      {banner && <AnnouncementBanner banner={banner} />}
      {user.impersonatedBy && (
        <ImpersonationBanner
          userLabel={user.name ?? user.email ?? "このユーザー"}
        />
      )}
      <div
        className={cn(
          "transition-theme flex min-h-screen",
          isPod && "theme-pod",
        )}
      >
        <Sidebar isPod={isPod} />
        <AppChromeProvider>
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader
              ledgers={options}
              activeId={activeId}
              tier={user.tier}
              userName={user.name ?? "ユーザー"}
              notifications={notifItems}
              unread={unread}
              isPod={isPod}
            />
            <main className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
              {children}
            </main>
          </div>
        </AppChromeProvider>
        <BottomBar />
        <CommandPalette isPod={isPod} />
        <KeyboardShortcuts
          enabled={isBetaEnabled(
            { optIn: user.betaOptIn, features: user.betaFeatures },
            "keyboard_shortcuts",
          )}
        />
      </div>
    </>
  );
}
