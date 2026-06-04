"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { SearchIcon, StarIcon, WalletIcon, RepeatIcon, type IconProps } from "@/components/icons";
import { cn } from "@/lib/cn";

interface Command {
  label: string;
  hint?: string;
  icon: (p: IconProps) => React.ReactElement;
  href: string;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const commands = useMemo<Command[]>(
    () => [
      ...NAV_ITEMS.map((n) => ({ label: n.label, icon: n.icon, href: n.href, hint: "移動" })),
      { label: "プラン・お支払い", icon: StarIcon, href: "/billing", hint: "移動" },
      { label: "記録を追加", icon: WalletIcon, href: "/transactions?new=1", hint: "操作" },
      { label: "サブスクを追加", icon: RepeatIcon, href: "/subscriptions?new=1", hint: "操作" },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    const q = trimmed.toLowerCase();
    const matched = q
      ? commands.filter((c) => c.label.toLowerCase().includes(q))
      : [...commands];
    // 入力があれば、その語で取引を横断検索するジャンプを末尾に追加。
    if (trimmed) {
      matched.push({
        label: `「${trimmed}」で取引を検索`,
        icon: SearchIcon,
        href: `/transactions?q=${encodeURIComponent(trimmed)}`,
        hint: "検索",
      });
    }
    return matched;
  }, [query, commands]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setActive(0);
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function run(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12dvh]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-lg">
        <div className="flex items-center gap-2 border-b border-border-subtle px-4">
          <SearchIcon size={18} className="text-text-tertiary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && filtered[active]) {
                run(filtered[active].href);
              }
            }}
            placeholder="ページや操作を検索…"
            className="h-12 w-full bg-transparent text-[16px] outline-none placeholder:text-text-tertiary"
          />
          <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-text-tertiary">esc</kbd>
        </div>
        <ul className="max-h-[50dvh] overflow-y-auto overscroll-contain p-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-[14px] text-text-tertiary">該当なし</li>
          ) : (
            filtered.map((c, i) => (
              <li key={c.label}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(c.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px]",
                    i === active ? "bg-accent/10 text-accent" : "text-text-primary",
                  )}
                >
                  <c.icon size={20} className={i === active ? "text-accent" : "text-text-secondary"} />
                  <span className="flex-1">{c.label}</span>
                  {c.hint && <span className="text-[12px] text-text-tertiary">{c.hint}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
