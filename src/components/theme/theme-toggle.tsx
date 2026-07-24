"use client";

import { useEffect, useRef, useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { SunIcon, MoonIcon, MonitorIcon } from "@/components/icons";
import {
  type Theme,
  THEME_EVENT,
  THEME_STORAGE_KEY,
  getStoredTheme,
  applyTheme,
  effectiveDark,
  setStoredTheme,
} from "@/lib/theme";

type VTDocument = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

/**
 * テーマを反映。可能なら View Transitions API でトグル位置からの円形リビール。
 * origin は押下要素の中心。非対応 / reduced-motion は即時切替。
 */
function applyWithReveal(next: Theme, origin: { x: number; y: number } | null) {
  const doc = document as VTDocument;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!doc.startViewTransition || reduce || !origin) {
    applyTheme(next);
    return;
  }

  const root = document.documentElement;
  root.setAttribute("data-vt", "");
  const transition = doc.startViewTransition(() => applyTheme(next));
  transition.ready
    .then(() => {
      const { x, y } = origin;
      const end = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );
      root
        .animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${end}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 480,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        )
        .finished.finally(() => root.removeAttribute("data-vt"));
    })
    .catch(() => root.removeAttribute("data-vt"));
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // localStorage（外部の永続ストア）からマウント時に初期同期する正当なケース。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme((prev) => {
      const s = getStoredTheme();
      return prev === s ? prev : s;
    });
    // 他トグル / 他タブ / OS 設定変更に追従して選択状態を同期。
    const onEvent = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) setTheme(getStoredTheme());
    };
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => applyTheme(getStoredTheme());
    window.addEventListener(THEME_EVENT, onEvent as EventListener);
    window.addEventListener("storage", onStorage);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener(THEME_EVENT, onEvent as EventListener);
      window.removeEventListener("storage", onStorage);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  function change(next: Theme, origin: { x: number; y: number } | null) {
    setTheme(next);
    applyWithReveal(next, origin);
    setStoredTheme(next);
  }

  if (compact) {
    const dark = effectiveDark(theme);
    const next: Theme = dark ? "light" : "dark";
    return (
      <button
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          change(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }}
        aria-label="テーマを切り替え"
        className="grid h-11 w-11 place-items-center rounded-full text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
      >
        {dark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
      </button>
    );
  }

  return (
    <div ref={wrapRef} className="inline-block">
      <Segmented<Theme>
        value={theme}
        onChange={(next) => {
          const r = wrapRef.current?.getBoundingClientRect();
          change(
            next,
            r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null,
          );
        }}
        options={[
          { value: "light", label: "ライト" },
          { value: "dark", label: "ダーク" },
          { value: "system", label: "自動" },
        ]}
      />
    </div>
  );
}

export { SunIcon, MoonIcon, MonitorIcon };
