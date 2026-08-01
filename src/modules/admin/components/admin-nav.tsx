"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartIcon,
  UsersIcon,
  LogoutIcon,
  ClockIcon,
  BoltIcon,
  SparklesIcon,
  BellIcon,
  SlidersIcon,
  CardIcon,
  FlagIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/admin", label: "概要", Icon: ChartIcon },
  { href: "/admin/users", label: "ユーザー", Icon: UsersIcon },
  { href: "/admin/analytics", label: "分析", Icon: SparklesIcon },
  { href: "/admin/ops", label: "運用", Icon: BoltIcon },
  { href: "/admin/billing", label: "課金", Icon: CardIcon },
  { href: "/admin/content", label: "配信", Icon: BellIcon },
  { href: "/admin/feedback", label: "ご意見", Icon: FlagIcon },
  { href: "/admin/settings", label: "設定", Icon: SlidersIcon },
  { href: "/admin/audit", label: "監査ログ", Icon: ClockIcon },
] as const;

/**
 * 管理コンソールの行き先。
 *
 * 項目が9つあり、狭い画面では収まらない。折り返すとヘッダーの高さが
 * 変わって本文が飛ぶので、横スクロールにする。
 * いまどこにいるかも出す。9つのうち1つを選んだ状態が見えないと、
 * 押したつもりで押せていないのか、そういう画面なのかが分からない。
 */
export function AdminNav({ openFeedback }: { openFeedback: number }) {
  const pathname = usePathname();

  return (
    <div className="flex min-w-0 items-center gap-1">
      <nav
        aria-label="管理コンソール"
        className="-mx-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ITEMS.map(({ href, label, Icon }) => {
        // 「/admin」は前方一致だと全部に当たってしまうので完全一致で見る。
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13.5px] transition",
                active
                  ? "bg-surface-2 font-medium text-text-primary"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
              )}
            >
              <Icon size={17} /> {label}
              {href === "/admin/feedback" && openFeedback > 0 && (
                <span className="ml-0.5 rounded-full bg-expense-solid px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                  {openFeedback}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {/* 「アプリへ戻る」だけはスクロールの外に置く。中に入れると、
          画面が狭いときに右端へ流れて見つからなくなる。管理画面から
          出られなくなったように見えるのは、いちばん困る。 */}
      <Link
        href="/dashboard"
        className="flex shrink-0 items-center gap-1.5 rounded-lg border-l border-border-subtle pl-3 pr-1 py-1.5 text-[14px] text-text-secondary transition hover:text-text-primary"
      >
        <LogoutIcon size={17} />
        <span className="hidden sm:inline">アプリへ</span>
      </Link>
    </div>
  );
}
