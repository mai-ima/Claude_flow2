"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { getActiveLedgerId, requireLedgerMember, assertLedgerOwnedRefs } from "@/lib/ledger-access";
import { canUse } from "@/lib/plans";
import type { PlanTier } from "@/lib/enums";
import { setBudgetInput, deleteBudgetInput } from "./schema";

async function requireBudgetsFeature(userId: string) {
  const b = await db.billingProfile.findUnique({ where: { userId } });
  if (!canUse((b?.tier ?? "FREE") as PlanTier, "budgets")) {
    throw new Error("PLAN_REQUIRED");
  }
}

function thisMonthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 全体予算 or カテゴリ予算を設定（既存があれば更新）。 */
export const setBudget = authedAction(setBudgetInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  await assertLedgerOwnedRefs(ledgerId, input);
  await requireBudgetsFeature(user.id);

  const isTotal = !input.categoryId;
  const existing = await db.budget.findFirst({
    where: isTotal
      ? { ledgerId, isTotalBudget: true }
      : { ledgerId, categoryId: input.categoryId },
  });

  if (existing) {
    await db.budget.update({ where: { id: existing.id }, data: { amount: input.amount } });
  } else {
    await db.budget.create({
      data: {
        ledgerId,
        categoryId: input.categoryId || null,
        isTotalBudget: isTotal,
        period: "MONTHLY",
        amount: input.amount,
        startMonth: thisMonthStart(),
      },
    });
  }
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { ok: true };
});

export const deleteBudget = authedAction(deleteBudgetInput, async ({ id }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const existing = await db.budget.findUnique({ where: { id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await db.budget.delete({ where: { id } });
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { ok: true };
});
