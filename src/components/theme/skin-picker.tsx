"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/icons";
import {
  type Skin,
  SKINS,
  SKIN_EVENT,
  SKIN_STORAGE_KEY,
  getStoredSkin,
  setStoredSkin,
} from "@/lib/theme";

/**
 * スキンの見本。
 *
 * 色はテーマ CSS 側の --sw-* から取る。スキンは :root[data-skin] に
 * 紐づくので入れ子では切り替えられず、見本だけは値を持つしかない。
 * その値をテーマ CSS に置いてあるのは、本物のトークンの真下に並べて
 * ずれに気づけるようにするため。ここでは色を一切書かない。
 */
function Preview({ skin }: { skin: Skin }) {
  return (
    <span
      className={cn("relative block h-12 w-full overflow-hidden rounded-xl", `skin-swatch--${skin}`)}
      style={{ background: "var(--sw-canvas)" }}
      aria-hidden
    >
      <span
        className="absolute left-2 top-2 h-8 w-[62%] rounded-lg border"
        style={{
          background: "var(--sw-card)",
          borderColor: "var(--sw-line)",
          boxShadow: "var(--sw-shadow)",
          backdropFilter: "var(--sw-glass)",
        }}
      />
      <span className="absolute bottom-2 right-2 h-4 w-8 rounded-full bg-accent-solid" />
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
              "relative rounded-2xl border p-3 text-left transition-all duration-[var(--dur-1)] ease-spring active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              // 選択の表し方は丸チェック1つに絞る。以前は枠・背景・輪郭・
              // 「選択中」の文字を重ねており、border と ring の半径差で
              // 輪郭が二重に見えていた。
              active ? "border-accent" : "border-border-subtle hover:bg-surface-3",
            )}
          >
            <Preview skin={s.value} />
            <span className="mt-2 block text-[14px] font-semibold">{s.label}</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-text-tertiary">
              {s.description}
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
