import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app/sidebar";
import { BottomBar } from "@/components/app/bottom-bar";
import { AppHeader, type LedgerOption } from "@/components/app/app-header";
import { CommandPalette } from "@/components/app/command-palette";
import { getCurrentUser } from "@/lib/auth";
import { listUserLedgers, getActiveLedgerId } from "@/lib/ledger-access";
import { listNotifications, unreadCount } from "@/modules/notifications/queries";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/cn";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [ledgers, activeId, notifs, unread] = await Promise.all([
    listUserLedgers(user.id),
    getActiveLedgerId(user.id),
    listNotifications(user.id),
    unreadCount(user.id),
  ]);

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
    <div className={cn("transition-theme flex min-h-screen", isPod && "theme-pod")}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          ledgers={options}
          activeId={activeId}
          tier={user.tier}
          userName={user.name ?? "ユーザー"}
          notifications={notifItems}
          unread={unread}
        />
        <main className="flex-1 pb-24 md:pb-10">{children}</main>
      </div>
      <BottomBar />
      <CommandPalette />
    </div>
  );
}
