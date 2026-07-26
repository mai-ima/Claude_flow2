"use client";

import { cn } from "@/lib/cn";

/** iOS 風トグルスイッチ。オンで緑（income）、つまみは spring で移動。 */
export function Switch({
  checked,
  onChange,
  disabled,
  id,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300 ease-spring",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1",
        // オフのトラックは面の色だけでは背景から見分けられないため輪郭線を添える
        // （オンは --income が背景に対して十分な差を持つので不要）。
        checked ? "bg-income" : "border border-control-border bg-control-track",
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-300 ease-spring",
          // オンの緑の上では白つまみだけで十分見分けられる。
          // オフの淡いトラックの上では輪郭線がないと位置が読み取れない。
          checked ? "translate-x-5" : "translate-x-0 border border-control-border",
        )}
      />
    </button>
  );
}
