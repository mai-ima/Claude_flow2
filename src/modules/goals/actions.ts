"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { getActiveLedgerId, requireLedgerMember } from "@/lib/ledger-access";
import { canUse } from "@/lib/plans";
import { nextMonthlyDate } from "@/lib/date";
import type { PlanTier } from "@/lib/enums";
import { goalInput, updateGoalInput, idInput, contributeInput } from "./schema";

async function requireGoalsFeature(userId: string) {
  const b = await db.billingProfile.findUnique({ where: { userId } });
  if (!canUse((b?.tier ?? "FREE") as PlanTier, "goals")) {
    throw new Error("PLAN_REQUIRED");
  }
}

/** 自動積立の有効/無効を判定し、保存用の値（次回実行日含む）を返す。 */
function resolveAutoContribution(
  amount: number | null | undefined,
  day: number | null | undefined,
  now: Date = new Date(),
): { autoContributionAmount: number | null; autoContributionDay: number | null; nextAutoContributionAt: Date | null } {
  const enabled = !!amount && amount > 0 && !!day;
  if (!enabled) {
    return { autoContributionAmount: null, autoContributionDay: null, nextAutoContributionAt: null };
  }
  return {
    autoContributionAmount: amount!,
    autoContributionDay: day!,
    nextAutoContributionAt: nextMonthlyDate(day!, now),
  };
}

export const createGoal = authedAction(goalInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  await requireGoalsFeature(user.id);
  const auto = resolveAutoContribution(input.autoContributionAmount, input.autoContributionDay);
  const goal = await db.goal.create({
    data: {
      ledgerId,
      name: input.name,
      targetAmount: input.targetAmount,
      deadline: input.deadline ?? null,
      color: input.color,
      ...auto,
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
  // 自動積立の設定が変わった場合のみ次回実行日を再計算（未変更なら既存日を保つ）。
  const settingsChanged =
    (input.autoContributionAmount ?? null) !== existing.autoContributionAmount ||
    (input.autoContributionDay ?? null) !== existing.autoContributionDay;
  const auto = settingsChanged
    ? resolveAutoContribution(input.autoContributionAmount, input.autoContributionDay)
    : {
        autoContributionAmount: existing.autoContributionAmount,
        autoContributionDay: existing.autoContributionDay,
        nextAutoContributionAt: existing.nextAutoContributionAt,
      };
  await db.goal.update({
    where: { id: input.id },
    data: {
      name: input.name,
      targetAmount: input.targetAmount,
      deadline: input.deadline ?? null,
      color: input.color,
      ...auto,
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
  // 0 未満への引き出しはクランプされるため、履歴には実際の増減（next - current）を記録。
  const delta = next - existing.currentAmount;
  await db.$transaction([
    db.goal.update({ where: { id }, data: { currentAmount: next } }),
    ...(delta !== 0
      ? [db.goalContribution.create({ data: { goalId: id, amount: delta, auto: false } })]
      : []),
  ]);
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
