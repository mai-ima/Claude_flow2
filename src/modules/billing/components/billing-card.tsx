"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PLANS } from "@/lib/plans";
import type { PlanTier } from "@/lib/enums";
import { postJson } from "@/lib/post-json";

export function BillingCard({
  tier,
  stripeEnabled,
}: {
  tier: PlanTier;
  stripeEnabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const plan = PLANS[tier];

  async function portal() {
    setLoading(true);
    try {
      const res = await postJson<{ url?: string }>("/api/stripe/portal");
      if (res.ok && res.data?.url) window.location.href = res.data.url;
      else toast.error(res.message ?? "現在ご利用いただけません。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[17px] font-semibold">{plan.name}プラン</span>
          {tier !== "FREE" && <Badge tone={tier === "PRO" ? "pod" : "accent"} size="sm">{tier}</Badge>}
        </div>
        <p className="mt-0.5 text-[13px] text-text-secondary">{plan.tagline}</p>
      </div>
      {tier === "FREE" ? (
        <ButtonLink href="/billing" size="sm">
          アップグレード
        </ButtonLink>
      ) : stripeEnabled ? (
        <Button size="sm" variant="gray" onClick={portal} disabled={loading}>
          {loading ? "…" : "請求を管理"}
        </Button>
      ) : (
        <ButtonLink href="/billing" size="sm" variant="gray">
          プランを見る
        </ButtonLink>
      )}
    </div>
  );
}
