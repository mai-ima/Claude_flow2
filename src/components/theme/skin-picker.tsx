"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import {
  type Skin,
  SKINS,
  SKIN_EVENT,
  SKIN_STORAGE_KEY,
  getStoredSkin,
  setStoredSkin,
} from "@/lib/theme";

/** スキンの見た目を示す小さなプレビュー（実際のトークンではなく静的な見本）。 */
function Preview({ skin }: { skin: Skin }) {
  if (skin === "liquidglass") {
    return (
      <span className="relative block h-12 w-full overflow-hidden rounded-xl bg-[linear-gradient(120deg,#cfe0ff,#e7ddff_45%,#d3f2e3)]">
        <span className="absolute left-2 top-2 h-8 w-[62%] rounded-lg border border-white/70 bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[6px]" />
        <span className="absolute bottom-2 right-2 h-4 w-8 rounded-full bg-[#0a7cff]" />
      </span>
    );
  }
  if (skin === "apple") {
    return (
      <span className="relative block h-12 w-full overflow-hidden rounded-xl bg-[#f2f2f7]">
        <span className="absolute inset-x-2 top-2 h-4 rounded-md border border-black/15 bg-white" />
        <span className="absolute inset-x-2 top-7 h-4 rounded-md border border-black/15 bg-white" />
        <span className="absolute bottom-[11px] right-3 h-2 w-6 rounded-full bg-[#007aff]" />
      </span>
    );
  }
  return (
    <span className="relative block h-12 w-full overflow-hidden rounded-xl bg-[#f2f2f6]">
      <span className="absolute left-2 top-2 h-8 w-[62%] rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.10)]" />
      <span className="absolute bottom-2 right-2 h-4 w-8 rounded-full bg-[#007aff]" />
    </span>
  );
}

/**
 * スキン（見た目のテーマ）の選択。ライト/ダークとは独立。
 * localStorage に保存し、他のタブ・他のピッカーとも同期する。
 */
export function SkinPicker() {
  const [skin, setSkin] = useState<Skin>("classic");

  useEffect(() => {
    // localStorage（外部の永続ストア）からマウント時に初期同期する正当なケース。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSkin((prev) => {
      const s = getStoredSkin();
      return prev === s ? prev : s;
    });
    const onEvent = (e: Event) => setSkin((e as CustomEvent<Skin>).detail);
    const onStorage = (e: StorageEvent) => {
      if (e.key === SKIN_STORAGE_KEY) setSkin(getStoredSkin());
    };
    window.addEventListener(SKIN_EVENT, onEvent as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SKIN_EVENT, onEvent as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <div role="radiogroup" aria-label="スキン" className="grid gap-2 sm:grid-cols-3">
      {SKINS.map((s) => {
        const active = s.value === skin;
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              setSkin(s.value);
              setStoredSkin(s.value);
            }}
            className={cn(
              "rounded-2xl border p-3 text-left transition-all duration-[var(--dur-1)] ease-spring active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              active
                ? "border-accent bg-accent/8 ring-1 ring-accent"
                : "border-border-subtle bg-surface-2 hover:bg-surface-3",
            )}
          >
            <Preview skin={s.value} />
            <span className="mt-2 flex items-center gap-1.5">
              <span className="text-[14px] font-semibold">{s.label}</span>
              {active && (
                <span className="text-[11px] font-medium text-accent">選択中</span>
              )}
            </span>
            <span className="mt-0.5 block text-[12px] leading-snug text-text-tertiary">
              {s.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
