/**
 * 触覚フィードバック（対応端末のみ）。ベータ機能の操作に手応えを添える。
 * 非対応・SSR では何もしない。
 */
export function haptic(pattern: number | number[] = 10): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(pattern);
  } catch {
    // 無視（一部ブラウザはユーザー操作外で例外）
  }
}
