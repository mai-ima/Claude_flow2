"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { LogoMark } from "@/components/icons";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border-subtle bg-surface-1 md:flex">
      <Link href="/dashboard" className="flex h-14 items-center gap-2 px-5 font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-white">
          <LogoMark size={20} />
        </span>
        <span className="text-[17px]">Tsumiki</span>
        <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-text-tertiary">
          BETA
        </span>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
              )}
            >
              <item.icon size={21} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
