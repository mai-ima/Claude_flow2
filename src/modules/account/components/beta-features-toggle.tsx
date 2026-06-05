"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { updateBetaOptIn } from "../actions";

const FEATURES = [
  "クイック金額・電卓キーパッド（記録入力）",
  "取引リストを左スワイプで「複製」（同じ内容を今日の記録として追加）",
  "操作のハプティック（対応端末）",
  "ダッシュボードの「今日あといくら使える」表示",
  "キーボードショートカット（n=記録 / s=サブスク / g→各ページ）",
  "予算額の数式入力（＋−×÷ で計算）",
];

export function BetaFeaturesToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [on, setOn] = useState(enabled);
  const [pending, start] = useTransition();

  function toggle(next: boolean) {
    setOn(next); // 楽観更新
    start(async () => {
      const res = await updateBetaOptIn({ enabled: next });
      if (!res.ok) {
        setOn(!next);
        toast.error(res.error);
        return;
      }
      toast.success(next ? "ベータ機能をオンにしました" : "ベータ機能をオフにしました");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-medium">ベータ機能を試す</div>
          <div className="text-[13px] text-text-tertiary">
            開発中の新機能をいち早く利用できます。不安定な場合はオフに戻せます。
          </div>
        </div>
        <Switch checked={on} onChange={toggle} disabled={pending} aria-label="ベータ機能" />
      </div>
      <ul className="space-y-1.5 rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-text-secondary">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
