"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { NAV_ITEMS } from "./nav-items";
import { logoutAction } from "@/app/(auth)/actions";
import { Badge } from "@/components/ui/badge";
import { LogoMark, StarIcon, LogoutIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export function MobileDrawer({
  open,
  onClose,
  userName,
  tier,
}: {
  open: boolean;
  onClose: () => void;
  userName: string;
  tier: string;
}) {
  const pathname = usePathname();
  // クライアントでのみ true（ポータル先 document.body はサーバーに存在しないため）。
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // ヘッダー(sticky z-30)の重なり順に閉じ込められないよう body 直下へポータル。
  // これで下タブバー(z-30)や FAB(z-30)より前面に出る。
  if (!mounted) return null;

  return createPortal(
    <div className={cn("md:hidden", open ? "pointer-events-auto" : "pointer-events-none")}>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      {/* panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex w-72 max-w-[82%] flex-col bg-surface-1 shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-white">
              <LogoMark size={20} />
            </span>
            <span className="text-[17px]">Tsumiki</span>
          </Link>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-text-secondary"
          >
            <XIcon size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-[16px] font-medium transition",
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                )}
              >
                <item.icon size={22} />
                {item.label}
              </Link>
            );
          })}

          <div className="my-2 border-t border-border-subtle" />

          <Link
            href="/billing"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-[16px] font-medium transition",
              pathname === "/billing" || pathname.startsWith("/billing/")
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
            )}
          >
            <StarIcon size={22} />
            <span className="flex-1">プラン・お支払い</span>
            {tier !== "FREE" && (
              <Badge tone={tier === "PRO" ? "pod" : "accent"} size="sm">
                {tier}
              </Badge>
            )}
          </Link>
        </nav>

        <div className="border-t border-border-subtle p-3">
          <div className="px-2 pb-2 text-[13px] text-text-tertiary">{userName} でログイン中</div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-expense transition hover:bg-expense/10"
            >
              <LogoutIcon size={20} />
              ログアウト
            </button>
          </form>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
