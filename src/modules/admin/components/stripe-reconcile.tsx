"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { reconcileStripe } from "../settings-actions";

type Diff = { userId: string; email: string | null; ours: string; theirs: string; fixed: boolean };

/**
 * Stripe と DB の突合。
 * まず差分を確認し、内容を見てから反映できるよう2段階にしている。
 */
export function StripeReconcile({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ checked: number; diffs: Diff[] } | null>(null);
  const [msg, setMsg] = useState<string>();

  function run(apply: boolean) {
    setMsg(undefined);
    start(async () => {
      if (apply) {
        const ok = await confirm({
          title: `${result?.diffs.length ?? 0}件の差分を反映しますか？`,
          body: "Stripe 側の状態に合わせて、こちらのプランを書き換えます。",
          confirmText: "反映する",
        });
        if (!ok) return;
      }
      const res = await reconcileStripe({ apply });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setResult(res.data);
      router.refresh();
    });
  }

  if (!enabled) {
    return (
      <p className="rounded-xl bg-surface-2 px-4 py-4 text-[13px] text-text-secondary">
        Stripe のキーが設定されていないため、突合は利用できません。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="gray" onClick={() => run(false)} disabled={pending}>
          {pending ? "確認中…" : "差分を確認する"}
        </Button>
        {result && result.diffs.length > 0 && (
          <Button size="sm" onClick={() => run(true)} disabled={pending}>
            差分を反映する
          </Button>
        )}
      </div>

      {result && (
        <div className="rounded-2xl border border-border-subtle bg-surface-1">
          <div className="border-b border-border-subtle px-4 py-2.5 text-[13px]">
            {result.checked}件を照合し、差分は {result.diffs.length}件でした。
          </div>
          {result.diffs.map((d) => (
            <div
              key={d.userId}
              className="flex flex-wrap items-baseline gap-2 border-b border-border-subtle px-4 py-2.5 text-[13px] last:border-b-0"
            >
              <span className="min-w-0 flex-1 truncate">{d.email}</span>
              <span className="text-text-tertiary">
                こちら {d.ours} → Stripe {d.theirs}
              </span>
              {d.fixed && <span className="text-income">反映済み</span>}
            </div>
          ))}
        </div>
      )}

      {msg && (
        <p role="alert" className="text-[13px] text-expense">
          {msg}
        </p>
      )}
    </div>
  );
}
