"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { isStripeEnabled } from "@/lib/env";

/**
 * デモ課金: Stripe キーが未設定（デモ運用）のときだけ、その場でプランを変更できる。
 * 実決済が有効な環境では無効化し、必ず Stripe checkout を通す。
 */
export const setDemoPlan = authedAction(
  z.object({ tier: z.enum(["FREE", "PLUS", "PRO"]) }),
  async ({ tier }, user) => {
    if (isStripeEnabled) {
      throw new Error("STRIPE_ACTIVE");
    }
    await db.billingProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, tier },
      update: { tier },
    });
    revalidatePath("/", "layout");
    return { tier };
  },
);
