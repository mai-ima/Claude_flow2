"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { CheckIcon } from "@/components/icons";
import { PLAN_LIST } from "@/lib/plans";
import { formatMoney } from "@/lib/money";
import type { PlanTier } from "@/lib/enums";
import { setDemoPlan } from "../actions";
import { cn } from "@/lib/cn";

export function BillingPlans({
  currentTier,
  stripeEnabled,
}: {
  currentTier: PlanTier;
  stripeEnabled: boolean;
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState<string | null>(null);
  const [, start] = useTransition();
  const [msg, setMsg] = useState<string>();

  async function realCheckout(tier: string) {
    setLoading(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, cycle }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setMsg(data.message ?? "現在この操作は利用できません。");
    } finally {
      setLoading(null);
    }
  }

  function demoChange(tier: PlanTier) {
    setMsg(undefined);
    setLoading(tier);
    start(async () => {
      const res = await setDemoPlan({ tier });
      setLoading(null);
      if (res.ok) {
        setMsg(`デモ: ${tier} プランに切り替えました。`);
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-center gap-3">
        <Segmented<"monthly" | "yearly">
          value={cycle}
          onChange={setCycle}
          options={[
            { value: "monthly", label: "月払い" },
            { value: "yearly", label: "年払い（お得）" },
          ]}
        />
      </div>

      {!stripeEnabled && (
        <p className="mb-5 rounded-xl bg-accent/8 px-4 py-3 text-center text-[13px] text-text-secondary">
          現在は<strong>デモモード</strong>です。実際の請求は発生せず、ボタンでプランを切り替えて各機能をお試しいただけます。
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {PLAN_LIST.map((plan) => {
          const price = cycle === "monthly" ? plan.monthly : plan.yearly;
          const isCurrent = plan.tier === currentTier;
          const isFree = plan.tier === "FREE";
          return (
            <Card
              key={plan.tier}
              className={cn(
                "relative flex flex-col p-7",
                isCurrent ? "ring-2 ring-accent" : plan.featured && "ring-1 ring-border-strong",
              )}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge tone="accent" size="md">ご利用中</Badge>
                </div>
              )}
              <h3 className="text-[22px] font-bold tracking-tight">{plan.name}</h3>
              <p className="mt-1 min-h-[40px] text-[14px] text-text-secondary">{plan.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-[34px] font-bold tracking-tight tabular-nums">
                  {isFree ? "¥0" : formatMoney(price)}
                </span>
                {!isFree && (
                  <span className="text-[14px] text-text-tertiary">
                    /{cycle === "monthly" ? "月" : "年"}
                  </span>
                )}
              </div>

              <div className="mt-6">
                {isCurrent ? (
                  <Button full variant="gray" disabled>
                    現在のプラン
                  </Button>
                ) : stripeEnabled ? (
                  isFree ? (
                    <Button full variant="ghost" disabled>
                      —
                    </Button>
                  ) : (
                    <Button
                      full
                      variant={plan.featured ? "filled" : "tinted"}
                      onClick={() => realCheckout(plan.tier)}
                      disabled={loading === plan.tier}
                    >
                      {loading === plan.tier ? "処理中…" : `${plan.name}にする`}
                    </Button>
                  )
                ) : (
                  <Button
                    full
                    variant={plan.featured ? "filled" : isFree ? "gray" : "tinted"}
                    onClick={() => demoChange(plan.tier)}
                    disabled={loading === plan.tier}
                  >
                    {loading === plan.tier
                      ? "切替中…"
                      : isFree
                        ? "フリーに戻す"
                        : `${plan.name}を試す`}
                  </Button>
                )}
              </div>

              <ul className="mt-7 space-y-3">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5 text-[14px]">
                    <CheckIcon size={18} className="mt-0.5 shrink-0 text-success" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {msg && <p className="mt-6 text-center text-[14px] text-accent">{msg}</p>}
    </div>
  );
}
