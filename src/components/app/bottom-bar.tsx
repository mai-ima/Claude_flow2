"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_ITEMS } from "./nav-items";
import { cn } from "@/lib/cn";

export function BottomBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-glass backdrop-blur-xl backdrop-saturate-150 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5 px-1.5 pt-1">
        {BOTTOM_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-w-0 flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-[color] duration-[var(--dur-1)] ease-spring active:scale-95",
                active ? "text-accent" : "text-text-tertiary",
              )}
            >
              {/* 幅は上限つきの可変。小型端末(320px)でも 5 列が収まる。 */}
              <span
                className={cn(
                  "grid h-8 w-full max-w-16 place-items-center rounded-full transition-all duration-[var(--dur-2)] ease-spring",
                  active ? "bg-accent/12 scale-100" : "scale-95 group-active:bg-surface-2",
                )}
              >
                <item.icon size={22} />
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
