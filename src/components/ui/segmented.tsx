"use client";

import { cn } from "@/lib/cn";

/** iOS 風セグメンテッドコントロール（選択ピルが spring でスライド）。 */
export function Segmented<T extends string>({
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
  const idx = options.findIndex((o) => o.value === value);
  const n = options.length;

  return (
    <div
      className={cn("relative inline-flex rounded-xl bg-control-track p-1", className)}
      /*
       * tabpanel を伴わない排他選択なので radiogroup が正しい。
       * tablist は aria-controls で結び付く tabpanel と矢印キー移動が前提で、
       * それが無いまま使うと支援技術に誤った操作方法を伝えてしまう。
       */
      role="radiogroup"
    >
      {/* スライドする選択インジケータ */}
      {idx >= 0 && (
        <span
          aria-hidden
          /*
           * 選択ピルは面の色だけでは識別できない（トラックとの差が 1.2:1 前後にしかならず、
           * SC 1.4.11 の 3:1 に届かない）。輪郭線で境界を示し、そこで 3:1 を担保する。
           */
          className="absolute inset-y-1 rounded-lg border border-control-border bg-control-thumb shadow-sm transition-transform duration-[var(--dur-2)] ease-spring"
          style={{
            left: 4,
            width: `calc((100% - 8px) / ${n})`,
            transform: `translateX(${idx * 100}%)`,
          }}
        />
      )}
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            // ラベルは短い語のため、狭い画面でも語中で折り返さない（「ライ/ト」を防ぐ）。
            "tap-target z-10 flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[14px] font-medium transition-colors duration-[var(--dur-1)] ease-spring",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
            value === o.value ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
