"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAppChrome } from "./app-chrome";
import { MobileDrawer } from "./mobile-drawer";
import { NotificationBell, type NotifItem } from "./notification-bell";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  ChevronDownIcon,
  UsersIcon,
  WalletIcon,
  SwapIcon,
  LogoutIcon,
  MenuIcon,
} from "@/components/icons";
import { switchLedger } from "@/modules/ledgers/actions";
import { logoutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/cn";
import { useDismissable } from "@/lib/use-dismissable";

export interface LedgerOption {
  id: string;
  name: string;
  type: string;
  memberCount: number;
}

export function AppHeader({
  ledgers,
  activeId,
  tier,
  userName,
  notifications,
  unread,
  isPod = false,
}: {
  ledgers: LedgerOption[];
  activeId: string;
  tier: string;
  userName: string;
  notifications: NotifItem[];
  unread: number;
  /** 共有帳簿かどうか。ドロワーの項目の出し分けに使う。 */
  isPod?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ledgerRef = useRef<HTMLDivElement>(null);
  const closeLedger = useCallback(() => setOpen(false), []);
  useDismissable(open, closeLedger, ledgerRef);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toast = useToast();
  const [pending, start] = useTransition();
  const active = ledgers.find((l) => l.id === activeId) ?? ledgers[0];
  const { title, promoted } = useAppChrome();

  function choose(id: string) {
    setOpen(false);
    if (id === activeId) return;
    start(async () => {
      const res = await switchLedger({ ledgerId: id });
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border-subtle bg-glass px-4 backdrop-blur-xl backdrop-saturate-150"
      style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(3.5rem + env(safe-area-inset-top))" }}
    >
      {/* スクロールで大型タイトルが隠れたら、ヘッダー中央へ昇格表示（iOS 風） */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center px-16 transition-all duration-[var(--dur-2)] ease-spring",
          promoted ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
        )}
        style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(3.5rem + env(safe-area-inset-top))" }}
      >
        <span className="max-w-full truncate text-[16px] font-semibold tracking-tight">
          {title}
        </span>
      </div>

      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="メニューを開く"
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-secondary transition hover:bg-surface-2 hover:text-text-primary md:hidden"
      >
        <MenuIcon size={22} />
      </button>
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userName={userName}
        tier={tier}
        isPod={isPod}
      />
      {/* 帳簿切替は可変幅。狭い端末では帳簿名を詰めて横スクロールを防ぐ。 */}
      <div className="relative min-w-0 flex-1" ref={ledgerRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            "flex min-h-11 w-full items-center gap-2 rounded-xl border border-border-subtle bg-surface-1 px-3 text-[14px] font-medium transition hover:bg-surface-2",
            pending && "opacity-60",
          )}
        >
          {active?.type === "POD" ? (
            <UsersIcon size={17} className="shrink-0 text-pod" />
          ) : (
            <WalletIcon size={17} className="shrink-0 text-accent" />
          )}
          <span className="min-w-0 flex-1 truncate text-left sm:max-w-[150px] sm:flex-none">
            {active?.name}
          </span>
          <ChevronDownIcon size={15} className="shrink-0 text-text-tertiary" />
        </button>

        {open && (
          <>
            <div className="absolute left-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-lg" role="menu">
              <div className="px-3 py-2 text-[11px] font-medium text-text-tertiary">帳簿を切り替え</div>
              {ledgers.map((l) => (
                <button
                  key={l.id}
                  onClick={() => choose(l.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[14px] transition hover:bg-surface-2"
                >
                  {l.type === "POD" ? (
                    <UsersIcon size={18} className="text-pod" />
                  ) : (
                    <WalletIcon size={18} className="text-accent" />
                  )}
                  <span className="flex-1 truncate">{l.name}</span>
                  {l.type === "POD" && (
                    <Badge tone="pod" size="sm">
                      {l.memberCount}人
                    </Badge>
                  )}
                  {l.id === activeId && <SwapIcon size={15} className="text-accent" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
        {tier !== "FREE" && (
          <Badge tone={tier === "PRO" ? "pod" : "accent"} size="md" className="hidden sm:inline-flex">
            {tier}
          </Badge>
        )}
        <NotificationBell items={notifications} unread={unread} />
        <ThemeToggle compact />
        {/* 狭い端末では非表示。メニュー(ドロワー)側にも同じ導線がある。 */}
        <form action={logoutAction} className="hidden min-[360px]:block">
          <button
            type="submit"
            aria-label="ログアウト"
            title={`${userName} ・ ログアウト`}
            className="grid h-11 w-11 place-items-center rounded-full text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
          >
            <LogoutIcon size={20} />
          </button>
        </form>
      </div>
    </header>
  );
}
