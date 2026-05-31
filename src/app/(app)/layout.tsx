import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app/sidebar";
import { BottomBar } from "@/components/app/bottom-bar";
import { AppHeader, type LedgerOption } from "@/components/app/app-header";
import { getCurrentUser } from "@/lib/auth";
import { listUserLedgers, getActiveLedgerId } from "@/lib/ledger-access";
import { cn } from "@/lib/cn";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [ledgers, activeId] = await Promise.all([
    listUserLedgers(user.id),
    getActiveLedgerId(user.id),
  ]);

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
        />
        <main className="flex-1 pb-24 md:pb-10">{children}</main>
      </div>
      <BottomBar />
    </div>
  );
}
