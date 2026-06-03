"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { XIcon } from "@/components/icons";

/**
 * iOS 風ハーフシート。モバイルは下からせり上がり、PC は中央寄りカード。
 * 入力動線を最小手数にするための主要コンテナ。
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center sm:items-center",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      {/* panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full sm:max-w-lg bg-surface-1 sm:rounded-3xl rounded-t-3xl shadow-lg",
          "max-h-[92vh] flex flex-col",
          "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open
            ? "translate-y-0 sm:scale-100 opacity-100"
            : "translate-y-8 sm:translate-y-4 sm:scale-95 opacity-0",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border-strong sm:hidden" />
        <div className="flex items-center justify-between px-5 py-3.5">
          <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-text-secondary hover:text-text-primary"
            aria-label="閉じる"
          >
            <XIcon size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && (
          <div className="border-t border-border-subtle px-5 py-3.5">{footer}</div>
        )}
      </div>
    </div>
  );
}
