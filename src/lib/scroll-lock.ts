"use client";

/**
 * 背面スクロールのロックを参照カウントで管理する。
 *
 * 各オーバーレイが個別に `document.body.style.overflow = ""` を書き戻していたため、
 * シートを開いたまま ⌘K パレットを開閉すると、まだシートが出ているのに
 * ロックが解除されて背面がスクロールしてしまっていた。
 * 解除は「最後の1つが閉じたとき」だけ行う。
 */
let count = 0;
let previous = "";

export function lockScroll(): void {
  if (typeof document === "undefined") return;
  if (count === 0) {
    previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  count++;
}

export function unlockScroll(): void {
  if (typeof document === "undefined") return;
  count = Math.max(0, count - 1);
  if (count === 0) {
    document.body.style.overflow = previous;
  }
}
