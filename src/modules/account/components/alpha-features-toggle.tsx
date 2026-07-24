"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { updateAlphaOptIn } from "../actions";

const FEATURES = [
  "3Dモード（カテゴリ支出を立体表示・ドラッグで回転）",
];

export function AlphaFeaturesToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [on, setOn] = useState(enabled);
  const [pending, start] = useTransition();

  function toggle(next: boolean) {
    setOn(next); // 楽観更新
    start(async () => {
      const res = await updateAlphaOptIn({ enabled: next });
      if (!res.ok) {
        setOn(!next);
        toast.error(res.error);
        return;
      }
      toast.success(next ? "α機能をオンにしました" : "α機能をオフにしました");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium">α（実験的）機能を試す</span>
            <Badge tone="pod" size="sm">ALPHA</Badge>
          </div>
          <div className="text-[13px] text-text-tertiary">
            まだ実験段階の先行機能です。動作が不安定なことがあります。いつでもオフに戻せます。
          </div>
        </div>
        <Switch checked={on} onChange={toggle} disabled={pending} aria-label="α機能" />
      </div>
      <ul className="space-y-1.5 rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-text-secondary">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-pod" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
