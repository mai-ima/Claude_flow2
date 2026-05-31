import Link from "next/link";
import { LogoMark } from "@/components/icons";
import { SITE } from "@/lib/seo";

const COLUMNS = [
  {
    title: "プロダクト",
    links: [
      { href: "/features", label: "機能" },
      { href: "/pricing", label: "料金プラン" },
      { href: "/login", label: "ログイン" },
    ],
  },
  {
    title: "サポート",
    links: [
      { href: "/legal/privacy", label: "プライバシーポリシー" },
      { href: "/legal/terms", label: "利用規約" },
      { href: "/legal/tokushoho", label: "特定商取引法に基づく表記" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border-subtle bg-surface-1">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-white">
              <LogoMark size={20} />
            </span>
            <span className="text-[17px]">{SITE.name}</span>
          </div>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-text-secondary">
            {SITE.tagline}
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-[13px] font-semibold text-text-tertiary">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-text-secondary transition hover:text-text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-5 py-5 text-[12px] text-text-tertiary">
          © {new Date().getFullYear()} {SITE.name}. すべての金額・データはご自身の端末とアカウントに紐づきます。
        </div>
      </div>
    </footer>
  );
}
