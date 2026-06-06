"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { MenuIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/features", label: "機能" },
  { href: "/pricing", label: "料金プラン" },
  { href: "/about", label: "会社" },
  { href: "/faq", label: "よくある質問" },
  { href: "/login", label: "ログイン" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="メニューを開く"
        className="grid h-10 w-10 place-items-center rounded-full text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
      >
        <MenuIcon size={22} />
      </button>

      <div
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-[var(--dur-2)] ease-spring",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-50 origin-top rounded-b-3xl border-b border-border-subtle bg-surface-1 p-5 shadow-lg transition-all duration-[var(--dur-2)] ease-spring",
          open ? "translate-y-0 opacity-100" : "-translate-y-4 pointer-events-none opacity-0",
        )}
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <div className="mb-2 flex justify-end">
          <button
            onClick={() => setOpen(false)}
            aria-label="閉じる"
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-text-secondary"
          >
            <XIcon size={18} />
          </button>
        </div>
        <nav className="space-y-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-[17px] font-medium text-text-primary transition hover:bg-surface-2"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <ButtonLink href="/signup" full size="lg" className="mt-4" onClick={() => setOpen(false)}>
          無料で始める
        </ButtonLink>
      </div>
    </div>
  );
}
