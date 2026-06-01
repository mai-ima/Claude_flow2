import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/icons";
import { SITE } from "@/lib/seo";

const NAV = [
  { href: "/features", label: "機能" },
  { href: "/pricing", label: "料金プラン" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-glass backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-white">
            <LogoMark size={20} />
          </span>
          <span className="text-[17px]">{SITE.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-1.5 text-[14px] text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-[14px] font-medium text-text-secondary transition hover:text-text-primary"
          >
            ログイン
          </Link>
          <ButtonLink href="/signup" size="sm">
            無料で始める
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
