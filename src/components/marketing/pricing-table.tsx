"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { CheckIcon } from "@/components/icons";
import { PLAN_LIST } from "@/lib/plans";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { postJson } from "@/lib/post-json";

export function PricingTable({ stripeEnabled }: { stripeEnabled: boolean }) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function subscribe(tier: string) {
    setLoading(tier);
    try {
      const res = await postJson<{ url?: string }>("/api/stripe/checkout", { tier, cycle });
      if (res.ok && res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      if (res.status === 401) {
        router.push("/login?next=/pricing");
        return;
      }
      toast.error(res.message ?? "現在この操作は利用できません。");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="flex justify-center">
        <Segmented<"monthly" | "yearly">
          value={cycle}
          onChange={setCycle}
          options={[
            { value: "monthly", label: "月払い" },
            { value: "yearly", label: "年払い（2ヶ月分お得）" },
          ]}
        />
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {PLAN_LIST.map((plan) => {
          const price = cycle === "monthly" ? plan.monthly : plan.yearly;
          const isFree = plan.tier === "FREE";
          return (
            <Card
              key={plan.tier}
              className={cn(
                "relative flex flex-col p-7 hover-lift",
                plan.featured && "ring-2 ring-accent",
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge tone="accent" size="md">
                    いちばん人気
                  </Badge>
                </div>
              )}
              <h3 className="text-[22px] font-bold tracking-tight">{plan.name}</h3>
              <p className="mt-1 min-h-[40px] text-[14px] text-text-secondary">
                {plan.tagline}
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-[36px] font-bold tracking-tight tabular-nums">
                  {isFree ? "¥0" : formatMoney(price)}
                </span>
                {!isFree && (
                  <span className="text-[14px] text-text-tertiary">
                    /{cycle === "monthly" ? "月" : "年"}
                  </span>
                )}
              </div>
              {!isFree && cycle === "yearly" && plan.monthly * 12 > plan.yearly && (
                <p className="mt-1 text-[13px] font-medium text-income">
                  月あたり {formatMoney(Math.round(plan.yearly / 12))}・年間{" "}
                  {formatMoney(plan.monthly * 12 - plan.yearly)} お得
                </p>
              )}

              <div className="mt-6">
                {isFree ? (
                  <ButtonLink href="/signup" full variant="gray">
                    無料で始める
                  </ButtonLink>
                ) : stripeEnabled ? (
                  <Button
                    full
                    variant={plan.featured ? "filled" : "tinted"}
                    onClick={() => subscribe(plan.tier)}
                    disabled={loading === plan.tier}
                  >
                    {loading === plan.tier ? "処理中…" : `${plan.name}にする`}
                  </Button>
                ) : (
                  <Button full variant="gray" disabled>
                    準備中
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

      {!stripeEnabled && (
        <p className="mt-8 text-center text-[13px] text-text-tertiary">
          ※ 決済は現在準備中です（Stripe のキーを設定すると有効になります）。
        </p>
      )}
    </div>
  );
}
