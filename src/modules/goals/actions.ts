"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { getActiveLedgerId, requireLedgerMember } from "@/lib/ledger-access";
import { canUse } from "@/lib/plans";
import type { PlanTier } from "@/lib/enums";
import { goalInput, updateGoalInput, idInput, contributeInput } from "./schema";

async function requireGoalsFeature(userId: string) {
  const b = await db.billingProfile.findUnique({ where: { userId } });
  if (!canUse((b?.tier ?? "FREE") as PlanTier, "goals")) {
    throw new Error("PLAN_REQUIRED");
  }
}

export const createGoal = authedAction(goalInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  await requireGoalsFeature(user.id);
  const goal = await db.goal.create({
    data: {
      ledgerId,
      name: input.name,
      targetAmount: input.targetAmount,
      deadline: input.deadline ?? null,
      color: input.color,
    },
  });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { id: goal.id };
});

export const updateGoal = authedAction(updateGoalInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const existing = await db.goal.findUnique({ where: { id: input.id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await db.goal.update({
    where: { id: input.id },
    data: {
      name: input.name,
      targetAmount: input.targetAmount,
      deadline: input.deadline ?? null,
      color: input.color,
    },
  });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
});

/** 積立（増減）。currentAmount は 0 未満にならないよう丸める。 */
export const contributeGoal = authedAction(contributeInput, async ({ id, amount }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const existing = await db.goal.findUnique({ where: { id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  const next = Math.max(0, existing.currentAmount + amount);
  await db.goal.update({ where: { id }, data: { currentAmount: next } });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { currentAmount: next };
});

export const deleteGoal = authedAction(idInput, async ({ id }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const existing = await db.goal.findUnique({ where: { id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await db.goal.delete({ where: { id } });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
});
