"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";

export interface SwipeAction {
  label: string;
  onClick: () => void;
  tone: "edit" | "delete" | "duplicate";
  icon?: React.ReactNode;
}

const ACTION_W = 76; // 1アクションの幅(px)

/**
 * 左スワイプでアクション（編集/削除）を表出するネイティブ風の行。
 * pointer events でタッチ/マウス両対応。横方向の意図的スワイプのみ反応し、
 * タップは onTap に委譲。prefers-reduced-motion 時はアニメ無し。
 */
export function SwipeRow({
  children,
  actions,
  onTap,
  className,
  haptics = true,
}: {
  children: React.ReactNode;
  actions: SwipeAction[];
  onTap?: () => void;
  className?: string;
  haptics?: boolean;
}) {
  const reveal = actions.length * ACTION_W;
  const [tx, setTx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, y: 0, tx: 0, active: false, moved: false });

  function down(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY, tx, active: true, moved: false };
  }
  function move(e: React.PointerEvent) {
    const s = start.current;
    if (!s.active) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!dragging) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        setDragging(true);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } else if (Math.abs(dy) > 12) {
        // 縦スクロールはスワイプ対象外
        s.active = false;
        return;
      } else {
        return;
      }
    }
    s.moved = true;
    setTx(Math.max(-reveal, Math.min(0, s.tx + dx)));
  }
  function up() {
    const s = start.current;
    if (!s.active) return;
    s.active = false;
    setDragging(false);
    if (!s.moved) {
      // タップ
      if (tx < 0) setTx(0);
      else onTap?.();
      return;
    }
    if (tx < -reveal / 2) {
      setTx(-reveal);
      if (haptics) haptic(10);
    } else {
      setTx(0);
    }
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* アクション層 */}
      {/* 引き出していない間はフォーカス対象にしない。
          20件並ぶと最大60個の不可視ボタンに Tab が入ってしまう。 */}
      <div className="absolute inset-y-0 right-0 flex" inert={tx === 0}>
        {actions.map((a) => (
          <button
            key={a.label}
            aria-label={a.label}
            onClick={() => {
              setTx(0);
              a.onClick();
            }}
            style={{ width: ACTION_W }}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-[12px] font-semibold text-white",
              a.tone === "delete"
                ? "bg-expense"
                : a.tone === "duplicate"
                  ? "bg-text-tertiary"
                  : "bg-accent-solid",
            )}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
      {/* 前景（コンテンツ） */}
      <div
        {...(onTap
          ? {
              role: "button" as const,
              tabIndex: 0,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onTap();
                } else if (e.key === "Escape" && tx !== 0) {
                  setTx(0);
                }
              },
            }
          : {})}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ transform: `translateX(${tx}px)`, touchAction: "pan-y" }}
        className={cn(
          "relative bg-surface-1",
          onTap &&
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60",
          !dragging && "transition-transform duration-[var(--dur-2)] ease-spring",
        )}
      >
        {children}
      </div>
    </div>
  );
}
