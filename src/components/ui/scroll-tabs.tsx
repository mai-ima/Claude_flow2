"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * 横スクロールするタブバー。項目数が多く等幅に収まらない場合に用いる
 * （少数・等幅なら Segmented を使う）。選択タブは自動で可視域へスクロールする。
 */
export function ScrollTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-value="${value}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={listRef}
        /*
       * tabpanel を伴わない排他選択なので radiogroup が正しい。
       * tablist は aria-controls で結び付く tabpanel と矢印キー移動が前提で、
       * それが無いまま使うと支援技術に誤った操作方法を伝えてしまう。
       */
      role="radiogroup"
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              role="radio"
              data-value={o.value}
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "min-h-11 shrink-0 snap-start whitespace-nowrap rounded-full px-4 text-[14px] font-medium",
                "transition-colors duration-[var(--dur-1)] ease-spring",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                active
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
