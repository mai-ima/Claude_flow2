"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/icons";
import { MobileNav } from "./mobile-nav";
import { SITE } from "@/lib/seo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/features", label: "機能" },
  { href: "/pricing", label: "料金プラン" },
  { href: "/about", label: "会社" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  // 途中までスクロールした位置で再読み込みすると、初期値 false の描画が一度出てから
  // 影が付き直してちらつく。最初の反映だけトランジションを外す。
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    const raf = requestAnimationFrame(() => setReady(true));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-glass backdrop-blur-xl backdrop-saturate-150",
        ready && "transition-[box-shadow,border-color] duration-300 ease-out",
        scrolled ? "border-border-subtle shadow-sm" : "border-transparent",
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent-solid text-white">
            <LogoMark size={20} />
          </span>
          <span className="text-[17px]">{SITE.name}</span>
          <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-text-tertiary">
            BETA
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[14px] transition",
                  active
                    ? "bg-surface-2 font-medium text-text-primary"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-1.5 text-[14px] font-medium text-text-secondary transition hover:text-text-primary sm:block"
          >
            ログイン
          </Link>
          <ButtonLink href="/signup" size="sm" className="hidden sm:inline-flex">
            無料で始める
          </ButtonLink>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
