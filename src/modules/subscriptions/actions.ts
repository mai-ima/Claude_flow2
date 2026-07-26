"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { getActiveLedgerId, requireLedgerMember, assertLedgerOwnedRefs } from "@/lib/ledger-access";
import { PLANS } from "@/lib/plans";
import type { PlanTier } from "@/lib/enums";
import {
  subscriptionInput,
  updateSubscriptionInput,
  idInput,
  markUsedInput,
  reviewInput,
} from "./schema";

async function userTier(userId: string): Promise<PlanTier> {
  const b = await db.billingProfile.findUnique({ where: { userId } });
  return (b?.tier ?? "FREE") as PlanTier;
}

export const createSubscription = authedAction(
  subscriptionInput,
  async (input, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
    await assertLedgerOwnedRefs(ledgerId, input);

    const tier = await userTier(user.id);
    const max = PLANS[tier].maxSubscriptions;
    if (max !== null) {
      const count = await db.subscription.count({ where: { ledgerId } });
      if (count >= max) throw new Error("SUB_LIMIT");
    }

    const sub = await db.subscription.create({
      data: {
        ledgerId,
        ownerUserId: user.id,
        name: input.name,
        amount: input.amount,
        cycle: input.cycle,
        status: input.status,
        nextRenewalAt: input.nextRenewalAt,
        trialEndsAt: input.status === "TRIAL" ? (input.trialEndsAt ?? null) : null,
        categoryId: input.categoryId || null,
        paymentMethodId: input.paymentMethodId || null,
        reminderDaysBefore: input.reminderDaysBefore,
        autoPostTransaction: input.autoPostTransaction,
        serviceKey: input.serviceKey || null,
        notes: input.notes || null,
      },
    });
    revalidatePath("/subscriptions");
    revalidatePath("/dashboard");
    return { id: sub.id };
  },
);

export const updateSubscription = authedAction(
  updateSubscriptionInput,
  async (input, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
    await assertLedgerOwnedRefs(ledgerId, input);
    const existing = await db.subscription.findUnique({ where: { id: input.id } });
    if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
    const priceChanged = input.amount !== existing.amount;
    await db.$transaction([
      db.subscription.update({
        where: { id: input.id },
        data: {
          name: input.name,
          amount: input.amount,
          cycle: input.cycle,
          status: input.status,
          nextRenewalAt: input.nextRenewalAt,
          trialEndsAt: input.status === "TRIAL" ? (input.trialEndsAt ?? null) : null,
          categoryId: input.categoryId || null,
          paymentMethodId: input.paymentMethodId || null,
          reminderDaysBefore: input.reminderDaysBefore,
          autoPostTransaction: input.autoPostTransaction,
          serviceKey: input.serviceKey || null,
          notes: input.notes || null,
        },
      }),
      // 金額が変わったら価格改定履歴を記録（値上げ表示・履歴に利用）。
      ...(priceChanged
        ? [
            db.subscriptionPriceChange.create({
              data: { subscriptionId: input.id, oldAmount: existing.amount, newAmount: input.amount },
            }),
          ]
        : []),
    ]);
    revalidatePath("/subscriptions");
    revalidatePath("/dashboard");
    return { id: input.id };
  },
);

export const deleteSubscription = authedAction(idInput, async ({ id }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const existing = await db.subscription.findUnique({ where: { id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await db.subscription.delete({ where: { id } });
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
  return { ok: true };
});

/** 「使った」ワンタップ記録（無駄検出のリセット）。 */
export const markUsed = authedAction(markUsedInput, async ({ id }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const existing = await db.subscription.findUnique({ where: { id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await db.subscription.update({ where: { id }, data: { lastUsedAt: new Date() } });
  revalidatePath("/subscriptions");
  return { ok: true };
});

/** サブスク・レビューの仕分け結果を記録。 */
export const recordReview = authedAction(reviewInput, async ({ id, decision }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const existing = await db.subscription.findUnique({ where: { id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await db.subscription.update({
    where: { id },
    data: {
      lastReviewedAt: new Date(),
      ...(decision === "KEEP" ? { lastUsedAt: new Date() } : {}),
    },
  });
  revalidatePath("/subscriptions");
  return { ok: true };
});
