"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction } from "@/lib/safe-action";
import { SETTING_DEFAULTS } from "@/lib/settings";
import { writeAudit } from "./audit";

/** 機能フラグの登録・更新。 */
export const upsertFlag = adminAction(
  "SUPER",
  z.object({
    key: z
      .string()
      .trim()
      .min(1, "キーを入力してください。")
      .regex(/^[a-z0-9_]+$/, "キーは英小文字・数字・アンダースコアで入力してください。"),
    label: z.string().trim().min(1, "表示名を入力してください。"),
    description: z.string().trim().optional(),
    enabled: z.coerce.boolean(),
    rolloutPct: z.coerce.number().int().min(0).max(100),
    tiers: z.array(z.enum(["FREE", "PLUS", "PRO"])).optional(),
  }),
  async (input, user) => {
    const before = await db.featureFlag.findUnique({ where: { key: input.key } });
    const data = {
      label: input.label,
      description: input.description?.trim() || null,
      enabled: input.enabled,
      rolloutPct: input.rolloutPct,
      tiers: input.tiers && input.tiers.length > 0 ? input.tiers : undefined,
    };
    await db.featureFlag.upsert({
      where: { key: input.key },
      create: { key: input.key, ...data },
      update: data,
    });
    await writeAudit({
      actor: user,
      action: "FEATURE_FLAG_CHANGE",
      targetType: "SYSTEM",
      targetId: input.key,
      targetLabel: input.label,
      before: before
        ? { enabled: before.enabled, rolloutPct: before.rolloutPct, tiers: before.tiers }
        : undefined,
      after: { enabled: input.enabled, rolloutPct: input.rolloutPct, tiers: input.tiers },
    });
    revalidatePath("/admin/settings");
    return { ok: true };
  },
);

export const deleteFlag = adminAction(
  "SUPER",
  z.object({ key: z.string() }),
  async (input, user) => {
    await db.featureFlag.delete({ where: { key: input.key } });
    await writeAudit({
      actor: user,
      action: "FEATURE_FLAG_CHANGE",
      targetType: "SYSTEM",
      targetId: input.key,
      targetLabel: `${input.key} を削除`,
    });
    revalidatePath("/admin/settings");
    return { ok: true };
  },
);

/**
 * システム設定の更新。
 * 既定値に無いキーは受け付けない（任意の値を書き込めるテーブルにしない）。
 */
export const updateSetting = adminAction(
  "SUPER",
  z.object({
    key: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
  async (input, user) => {
    if (!(input.key in SETTING_DEFAULTS)) throw new Error("NOT_FOUND");
    const before = await db.systemSetting.findUnique({ where: { key: input.key } });
    await db.systemSetting.upsert({
      where: { key: input.key },
      create: { key: input.key, value: input.value },
      update: { value: input.value },
    });
    await writeAudit({
      actor: user,
      action: "SYSTEM_SETTING_CHANGE",
      targetType: "SYSTEM",
      targetId: input.key,
      before: before ? { value: before.value } : undefined,
      after: { value: input.value },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  },
);

/**
 * Stripe との突合。
 * webhook を取りこぼすと DB と Stripe がずれるが、これまで検知手段が無かった。
 * Stripe 側の subscription を引いて BillingProfile と比べ、差分を返す。
 */
export const reconcileStripe = adminAction("SUPER", z.object({ apply: z.coerce.boolean() }), async (input, user) => {
  const { stripe, isStripeEnabled, tierFromPriceId } = await import("@/lib/stripe");
  if (!isStripeEnabled || !stripe) throw new Error("STRIPE_DISABLED");

  const profiles = await db.billingProfile.findMany({
    where: { stripeCustomerId: { not: null } },
    select: {
      userId: true,
      tier: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      user: { select: { email: true } },
    },
  });

  const diffs: {
    userId: string;
    email: string | null;
    ours: string;
    theirs: string;
    fixed: boolean;
  }[] = [];

  for (const p of profiles) {
    if (!p.stripeCustomerId) continue;
    const subs = await stripe.subscriptions.list({
      customer: p.stripeCustomerId,
      status: "all",
      limit: 5,
    });
    const live = subs.data.find((s) => s.status === "active" || s.status === "trialing");
    const priceId = live?.items?.data?.[0]?.price?.id;
    const theirs = live ? (priceId ? (tierFromPriceId(priceId) ?? "PLUS") : "PLUS") : "FREE";
    if (theirs === p.tier) continue;

    let fixed = false;
    if (input.apply) {
      await db.billingProfile.update({
        where: { userId: p.userId },
        data: { tier: theirs, stripeSubscriptionId: live?.id ?? null },
      });
      fixed = true;
    }
    diffs.push({ userId: p.userId, email: p.user.email, ours: p.tier, theirs, fixed });
  }

  await writeAudit({
    actor: user,
    action: "STRIPE_SYNC",
    targetType: "SYSTEM",
    targetLabel: input.apply ? "差分を反映" : "差分を確認",
    after: { checked: profiles.length, diffs: diffs.length },
  });
  revalidatePath("/admin/billing");
  return { checked: profiles.length, diffs };
});
