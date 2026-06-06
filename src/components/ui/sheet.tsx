"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";
import { XIcon } from "@/components/icons";

/**
 * iOS 風ハーフシート。モバイルは下からせり上がり、PC は中央寄りカード。
 * 入力動線を最小手数にするための主要コンテナ。
 * モバイルでは visualViewport に追従し、ソフトキーボード表示時もシート全体
 * （保存ボタン含む）が画面内に収まるようにする。
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
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function focusable(): HTMLElement[] {
      const panel = panelRef.current;
      if (!panel) return [];
      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Tab を内側に閉じ込める（背面へフォーカスが漏れないように）。
      if (e.key === "Tab") {
        const items = focusable();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const activeEl = document.activeElement as HTMLElement | null;
        if (e.shiftKey && activeEl === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    // 開いた直後、先頭の操作要素へフォーカス（入力動線を即時に）。
    const t = window.setTimeout(() => {
      const items = focusable();
      const target = items.find((el) => el.getAttribute("aria-label") !== "閉じる") ?? items[0];
      target?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  // ソフトキーボード表示などで可視領域が縮んでも、コンテナを実際の可視高さに
  // 合わせて下端をキーボードの上に保つ（シートが画面外にはみ出すのを防ぐ）。
  useEffect(() => {
    const vv = window.visualViewport;
    const el = containerRef.current;
    if (!open || !vv || !el) return;
    const update = () => {
      el.style.height = `${vv.height}px`;
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      el.style.height = "";
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-[100dvh] items-end justify-center sm:items-center",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-[var(--dur-2)] ease-spring",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      {/* panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "relative w-full sm:max-w-lg bg-surface-1 sm:rounded-3xl rounded-t-3xl shadow-lg",
          "max-h-full sm:max-h-[92dvh] flex flex-col",
          "transition-all duration-[var(--dur-2)] ease-spring",
          open
            ? "translate-y-0 sm:scale-100 opacity-100"
            : "translate-y-8 sm:translate-y-4 sm:scale-95 opacity-0",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" />
        <div className="flex shrink-0 items-center justify-between px-5 py-3.5">
          <h2 id={titleId} className="text-[18px] font-semibold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-text-secondary hover:text-text-primary"
            aria-label="閉じる"
          >
            <XIcon size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-border-subtle px-5 py-3.5">{footer}</div>
        )}
      </div>
    </div>
  );
}
