"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { updateBetaOptIn, updateBetaFeature } from "../actions";
import { BETA_FEATURES, type BetaFeatureKey } from "@/lib/beta-features";

export function BetaFeaturesToggle({
  enabled,
  features,
}: {
  enabled: boolean;
  /** 有効なキーの一覧（親スイッチ適用後の実効値）。 */
  features: BetaFeatureKey[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [on, setOn] = useState(enabled);
  const [active, setActive] = useState<BetaFeatureKey[]>(features);
  const [pending, start] = useTransition();

  function toggleAll(next: boolean) {
    const prevOn = on;
    const prevActive = active;
    setOn(next);
    setActive(next ? BETA_FEATURES.map((f) => f.key) : []);
    start(async () => {
      const res = await updateBetaOptIn({ enabled: next });
      if (!res.ok) {
        setOn(prevOn);
        setActive(prevActive);
        toast.error(res.error);
        return;
      }
      toast.success(next ? "ベータ機能をオンにしました" : "ベータ機能をオフにしました");
      router.refresh();
    });
  }

  function toggleOne(key: BetaFeatureKey, next: boolean) {
    const prevOn = on;
    const prevActive = active;
    const nextActive = next ? [...active, key] : active.filter((k) => k !== key);
    setActive(nextActive);
    if (next) setOn(true);
    start(async () => {
      const res = await updateBetaFeature({ key, enabled: next });
      if (!res.ok) {
        setOn(prevOn);
        setActive(prevActive);
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-medium">ベータ機能を試す</div>
          <div className="text-[13px] text-text-tertiary">
            開発中の機能を先に使えます。下の一覧から、使いたいものだけを選べます。
          </div>
        </div>
        <Switch
          checked={on}
          onChange={toggleAll}
          disabled={pending}
          aria-label="ベータ機能をまとめて切り替え"
        />
      </div>

      <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl bg-surface-2">
        {BETA_FEATURES.map((f) => {
          const checked = active.includes(f.key);
          return (
            <li key={f.key} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-text-primary">{f.label}</div>
                <div className="text-[13px] leading-relaxed text-text-secondary">
                  {f.description}
                </div>
              </div>
              <Switch
                checked={checked}
                onChange={(v) => toggleOne(f.key, v)}
                disabled={pending}
                aria-label={f.label}
              />
            </li>
          );
        })}
      </ul>

      {on && active.length === 0 && (
        <p className="text-[13px] text-text-tertiary">
          有効な機能がありません。使いたいものを上の一覧から選んでください。
        </p>
      )}
    </div>
  );
}
