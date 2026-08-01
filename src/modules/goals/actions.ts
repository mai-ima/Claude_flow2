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

  /*
   * 読んでから足して書く、をやめる。
   *
   * 共有帳簿で2人が同時に積み立てると、あとの書き込みが先の分を
   * まるごと上書きし、片方の積立が消える。1万円ずつ入れたのに
   * 1万円しか増えない、ということが起こる。
   *
   * データベース側で1文にまとめて、足し算を任せる。
   * GREATEST(0, ...) で「引き出しすぎても0で止まる」という
   * これまでの挙動もそのまま保つ。
   * 自己結合しているのは、更新前の額も一緒に返すため。
   * 履歴には実際に動いた額（after - before）を残す必要がある。
   */
  const rows = await db.$queryRaw<{ before: number; after: number }[]>`
    UPDATE "Goal" g
    SET "currentAmount" = GREATEST(0, g."currentAmount" + ${amount})
    FROM "Goal" old
    WHERE g.id = old.id AND g.id = ${id} AND g."ledgerId" = ${ledgerId}
    RETURNING old."currentAmount" AS before, g."currentAmount" AS after
  `;
  if (rows.length === 0) throw new Error("NOT_FOUND");

  const { before, after } = rows[0];
  const delta = after - before;
  // 実際に動いていないなら履歴も残さない（0円の行が並ぶだけになる）。
  if (delta !== 0) {
    await db.goalContribution.create({ data: { goalId: id, amount: delta, auto: false } });
  }

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { currentAmount: after };
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
