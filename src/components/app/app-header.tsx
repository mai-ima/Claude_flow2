"use client";

import { useState, useTransition } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { ChevronDownIcon, UsersIcon, WalletIcon, SwapIcon, LogoutIcon } from "@/components/icons";
import { switchLedger } from "@/modules/ledgers/actions";
import { logoutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/cn";

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
}: {
  ledgers: LedgerOption[];
  activeId: string;
  tier: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const active = ledgers.find((l) => l.id === activeId) ?? ledgers[0];

  function choose(id: string) {
    setOpen(false);
    if (id === activeId) return;
    start(() => {
      switchLedger({ ledgerId: id });
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border-subtle bg-glass px-4 backdrop-blur-xl backdrop-saturate-150">
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-1 px-3 py-1.5 text-[14px] font-medium transition hover:bg-surface-2",
            pending && "opacity-60",
          )}
        >
          {active?.type === "POD" ? (
            <UsersIcon size={17} className="text-pod" />
          ) : (
            <WalletIcon size={17} className="text-accent" />
          )}
          <span className="max-w-[150px] truncate">{active?.name}</span>
          <ChevronDownIcon size={15} className="text-text-tertiary" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-lg">
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

      <div className="flex items-center gap-1.5">
        {tier !== "FREE" && (
          <Badge tone={tier === "PRO" ? "pod" : "accent"} size="md">
            {tier}
          </Badge>
        )}
        <ThemeToggle compact />
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="ログアウト"
            title={`${userName} ・ ログアウト`}
            className="grid h-10 w-10 place-items-center rounded-full text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
          >
            <LogoutIcon size={20} />
          </button>
        </form>
      </div>
    </header>
  );
}
