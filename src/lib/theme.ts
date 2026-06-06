/**
 * テーマ（light/dark/system）の純ロジック。
 * `layout.tsx` の先行スクリプトと挙動を一致させ、各 ThemeToggle で共有する。
 * window/localStorage は呼び出し時にのみ参照（SSR 安全）。
 */

export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "tsumiki-theme";
/** トグル間で選択状態を同期するためのカスタムイベント名。 */
export const THEME_EVENT = "tsumiki-theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* localStorage 不可時は system 既定 */
  }
  return "system";
}

/** 指定テーマの実効ダーク判定（system は OS 設定に従う）。 */
export function effectiveDark(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** <html> に dark クラスを反映。 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", effectiveDark(theme));
}

/** 永続化 + 反映 + 他トグルへの同期通知をまとめて行う。 */
export function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* 失敗しても DOM 反映は続行 */
  }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}
