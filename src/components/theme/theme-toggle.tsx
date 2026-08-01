"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { SunIcon, MoonIcon, MonitorIcon, CheckIcon } from "@/components/icons";
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

const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
  { value: "light", label: "ライト", description: "つねに明るい配色" },
  { value: "dark", label: "ダーク", description: "つねに暗い配色" },
  { value: "system", label: "自動", description: "端末の設定に合わせる" },
];

/** 見本の片面（明 or 暗）。 */
const SWATCH_SIDES = {
  light: {
    canvas: "var(--theme-swatch-light-canvas)",
    card: "var(--theme-swatch-light-card)",
    line: "var(--theme-swatch-light-line)",
  },
  dark: {
    canvas: "var(--theme-swatch-dark-canvas)",
    card: "var(--theme-swatch-dark-card)",
    line: "var(--theme-swatch-dark-line)",
  },
} as const;

function SwatchHalf({ side }: { side: keyof typeof SWATCH_SIDES }) {
  const c = SWATCH_SIDES[side];
  return (
    <span className="absolute inset-0" style={{ background: c.canvas }}>
      <span
        className="absolute left-2 top-2 h-8 w-[62%] rounded-lg border"
        style={{ background: c.card, borderColor: c.line }}
      />
    </span>
  );
}

/** テーマの見本。自動は明暗を斜めに分けて示す。 */
function ThemePreview({ value }: { value: Theme }) {
  return (
    <span className="relative block h-12 w-full overflow-hidden rounded-xl" aria-hidden>
      {value === "dark" ? (
        <SwatchHalf side="dark" />
      ) : value === "light" ? (
        <SwatchHalf side="light" />
      ) : (
        <>
          <SwatchHalf side="light" />
          <span
            className="absolute inset-0"
            style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
          >
            <SwatchHalf side="dark" />
          </span>
        </>
      )}
      <span className="absolute bottom-2 right-2 h-4 w-8 rounded-full bg-accent-solid" />
    </span>
  );
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");

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
    <div role="radiogroup" aria-label="テーマ" className="grid gap-2 sm:grid-cols-3">
      {THEME_OPTIONS.map((o) => {
        const active = o.value === theme;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={(e) => {
              // 起点は押された選択肢そのもの。以前はコンテナ全体の中心を
              // 使っており、どれを押しても同じ場所から広がっていた。
              const r = e.currentTarget.getBoundingClientRect();
              change(o.value, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }}
            className={cn(
              "relative rounded-2xl border p-3 text-left transition-all duration-[var(--dur-1)] ease-spring active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              active ? "border-accent" : "border-border-subtle hover:bg-surface-3",
            )}
          >
            <ThemePreview value={o.value} />
            <span className="mt-2 block text-[14px] font-semibold">{o.label}</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-text-tertiary">
              {o.description}
            </span>
            {active && (
              <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-accent-solid text-white">
                <CheckIcon size={13} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { SunIcon, MoonIcon, MonitorIcon };
