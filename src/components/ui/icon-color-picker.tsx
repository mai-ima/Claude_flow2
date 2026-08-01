"use client";

import { CategoryIcon } from "@/components/icons";
import { colorOf } from "@/lib/colors";
import { cn } from "@/lib/cn";

/**
 * アイコンと色の選び方。
 *
 * 以前は選択欄に名前が並ぶだけで、選んでみるまでどう見えるか分からなかった。
 * 実物を並べて押して選ぶ形にする。名前も残す（見た目だけだと、支援技術から
 * 何を選んでいるのか分からない）。
 */

export const ICON_CHOICES: { value: string; label: string }[] = [
  { value: "tag", label: "タグ" },
  { value: "food", label: "食事" },
  { value: "cart", label: "買い物" },
  { value: "home", label: "住まい" },
  { value: "bolt", label: "水道・光熱" },
  { value: "train", label: "交通" },
  { value: "wifi", label: "通信" },
  { value: "play", label: "娯楽" },
  { value: "heart", label: "健康・医療" },
  { value: "gift", label: "贈り物" },
  { value: "briefcase", label: "仕事" },
  { value: "music", label: "音楽" },
  { value: "cloud", label: "サブスク" },
  { value: "sparkles", label: "美容" },
  { value: "card", label: "カード" },
  { value: "wallet", label: "財布" },
];

export const COLOR_CHOICES: { value: string; label: string }[] = [
  { value: "blue", label: "ブルー" },
  { value: "teal", label: "ティール" },
  { value: "green", label: "グリーン" },
  { value: "mint", label: "ミント" },
  { value: "yellow", label: "イエロー" },
  { value: "orange", label: "オレンジ" },
  { value: "pink", label: "ピンク" },
  { value: "red", label: "レッド" },
  { value: "purple", label: "パープル" },
  { value: "indigo", label: "インディゴ" },
  { value: "cyan", label: "シアン" },
  { value: "gray", label: "グレー" },
];

export function IconPicker({
  value,
  onChange,
  color,
  label = "アイコン",
}: {
  value: string;
  onChange: (v: string) => void;
  /** 選択中の色。実際の見え方で選べるようにする。 */
  color: string;
  label?: string;
}) {
  return (
    <div>
      <span className="text-[12px] text-text-tertiary">{label}</span>
      {/* 排他選択で、対応する表示領域を持たないので radiogroup。 */}
      <div role="radiogroup" aria-label={label} className="mt-1.5 flex flex-wrap gap-2">
        {ICON_CHOICES.map((i) => {
          const on = i.value === value;
          return (
            <button
              key={i.value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={i.label}
              title={i.label}
              onClick={() => onChange(i.value)}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-xl border transition",
                on
                  ? "border-accent ring-2 ring-accent/40"
                  : "border-border-subtle hover:border-border-strong",
              )}
              style={on ? { background: colorOf(color), color: "#fff" } : undefined}
            >
              <CategoryIcon
                name={i.value}
                size={20}
                className={on ? undefined : "text-text-secondary"}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
  label = "色",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div>
      <span className="text-[12px] text-text-tertiary">{label}</span>
      <div role="radiogroup" aria-label={label} className="mt-1.5 flex flex-wrap gap-2">
        {COLOR_CHOICES.map((c) => {
          const on = c.value === value;
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={c.label}
              title={c.label}
              onClick={() => onChange(c.value)}
              className={cn(
                // 当たり判定は 44px を保ちつつ、見た目の丸は小さくする。
                "grid h-11 w-11 place-items-center rounded-full transition",
                on && "ring-2 ring-accent ring-offset-2 ring-offset-surface-1",
              )}
            >
              <span
                aria-hidden
                className="h-6 w-6 rounded-full border border-black/10"
                style={{ background: colorOf(c.value) }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
