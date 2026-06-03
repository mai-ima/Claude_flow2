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
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1",
        checked ? "bg-income" : "bg-surface-3",
        disabled && "opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
