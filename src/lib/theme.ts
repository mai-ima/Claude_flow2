/**
 * テーマ（light/dark/system）の純ロジック。
 * `layout.tsx` の先行スクリプトと挙動を一致させ、各 ThemeToggle で共有する。
 * window/localStorage は呼び出し時にのみ参照（SSR 安全）。
 */

export type Theme = "light" | "dark" | "system";

/** 見た目のスキン。ライト/ダークとは独立して選べる。 */
export type Skin = "classic" | "apple" | "liquidglass";

export const SKINS: { value: Skin; label: string; description: string }[] = [
  {
    value: "classic",
    label: "クラシック",
    description: "これまでの Tsumiki。白いカードと繊細な影。",
  },
  {
    value: "apple",
    label: "Apple",
    description: "透明感に頼らず、余白と区切り線で整えた端正な表示。",
  },
  {
    value: "liquidglass",
    label: "リキッドグラス",
    description: "背景が透けるガラス質。iOS 26 のような奥行き。",
  },
];

export const THEME_STORAGE_KEY = "tsumiki-theme";
export const SKIN_STORAGE_KEY = "tsumiki-skin";
/** トグル間で選択状態を同期するためのカスタムイベント名。 */
export const THEME_EVENT = "tsumiki-theme";
export const SKIN_EVENT = "tsumiki-skin";

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

/* ───────────── スキン（見た目のテーマ） ───────────── */

export function isSkin(v: unknown): v is Skin {
  return v === "classic" || v === "apple" || v === "liquidglass";
}

export function getStoredSkin(): Skin {
  if (typeof window === "undefined") return "classic";
  try {
    const v = localStorage.getItem(SKIN_STORAGE_KEY);
    if (isSkin(v)) return v;
  } catch {
    /* localStorage 不可時は classic 既定 */
  }
  return "classic";
}

/** <html data-skin> に反映。CSS 側はこの属性でトークンを切り替える。 */
export function applySkin(skin: Skin): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.skin = skin;
}

export function setStoredSkin(skin: Skin): void {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, skin);
  } catch {
    /* 失敗しても DOM 反映は続行 */
  }
  applySkin(skin);
  window.dispatchEvent(new CustomEvent<Skin>(SKIN_EVENT, { detail: skin }));
}
