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
      { href: "/signup", label: "新規登録" },
    ],
  },
  {
    title: "会社",
    links: [
      { href: "/about", label: "Tsumiki について" },
      { href: "/faq", label: "よくある質問" },
      { href: "/changelog", label: "リリースノート" },
    ],
  },
  {
    title: "サポート",
    links: [
      { href: "/help", label: "ヘルプセンター" },
      { href: "/contact", label: "お問い合わせ" },
    ],
  },
  {
    title: "法務",
    links: [
      { href: "/legal/privacy", label: "プライバシーポリシー" },
      { href: "/legal/terms", label: "利用規約" },
      { href: "/legal/tokushoho", label: "特定商取引法に基づく表記" },
      { href: "/legal/security", label: "セキュリティ" },
      { href: "/legal/cookies", label: "Cookie ポリシー" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border-subtle bg-surface-1">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent-solid text-white">
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
