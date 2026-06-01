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
      <div className="grid grid-cols-5">
        {BOTTOM_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition",
                active ? "text-accent" : "text-text-tertiary",
              )}
            >
              <item.icon size={23} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
