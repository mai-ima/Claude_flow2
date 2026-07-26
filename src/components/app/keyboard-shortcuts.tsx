"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * 単キーのキーボードショートカット（ベータ）。コマンドパレット(⌘K)を補完する。
 *  n … 記録を追加 / s … サブスクを追加
 *  g → d/t/u/b/r/o … 各ページへ移動（g を押してから2文字目）
 * 入力中（input/textarea/select/contentEditable）や修飾キー併用時は無効。
 */
export function KeyboardShortcuts({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const gAt = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    function isTyping(el: EventTarget | null): boolean {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        node.isContentEditable === true
      );
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      // シートやダイアログが開いている間は無効にする。
      // 入力欄の外にフォーカスがある状態で n を押すと、書きかけの内容を
      // 捨てて別ページへ遷移してしまう。
      // 閉じたシートは inert が付いた祖先の中にあるので除外する。
      const modalOpen = Array.from(
        document.querySelectorAll('[role="dialog"][aria-modal="true"]'),
      ).some((el) => !el.closest("[inert]"));
      if (modalOpen) return;

      const k = e.key.toLowerCase();
      const now = Date.now();
      const afterG = now - gAt.current < 800;

      if (afterG) {
        const dest: Record<string, string> = {
          d: "/dashboard",
          t: "/transactions",
          u: "/subscriptions",
          b: "/budgets",
          r: "/reports",
          o: "/goals",
        };
        if (dest[k]) {
          e.preventDefault();
          gAt.current = 0;
          router.push(dest[k]);
          return;
        }
      }

      if (k === "g") {
        gAt.current = now;
        return;
      }
      if (k === "n") {
        e.preventDefault();
        router.push("/transactions?new=1");
      } else if (k === "s") {
        e.preventDefault();
        router.push("/subscriptions?new=1");
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, router]);

  return null;
}
