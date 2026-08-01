"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { getActiveLedgerId, requireLedgerMember, assertLedgerOwnedRefs } from "@/lib/ledger-access";
import { canUse } from "@/lib/plans";
import type { PlanTier } from "@/lib/enums";
import { setBudgetInput, deleteBudgetInput } from "./schema";
import { jstYearMonth, monthAnchorJST } from "@/lib/date";

async function requireBudgetsFeature(userId: string) {
  const b = await db.billingProfile.findUnique({ where: { userId } });
  if (!canUse((b?.tier ?? "FREE") as PlanTier, "budgets")) {
    throw new Error("PLAN_REQUIRED");
  }
}

/** 今月の1日（日本時間）。予算の開始月として持つ。 */
function thisMonthStart(): Date {
  const { year, month } = jstYearMonth(new Date());
  return monthAnchorJST(year, month);
}

/**
 * 全体予算 or カテゴリ予算を設定（既存があれば更新）。
 *
 * 予算は「継続的な月次予算」で、カテゴリごとに1件だけ持つ。
 * そのため startMonth は抽出条件に使わず、既存行があれば金額だけ更新する
 * （月ごとに別レコードを作ると、当月の予算だけ見る UI と噛み合わない）。
 */
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
    await db.budget.update({
      where: { id: existing.id },
      data: { amount: input.amount, carryOver: input.carryOver ?? existing.carryOver },
    });
  } else {
    await db.budget.create({
      data: {
        ledgerId,
        categoryId: input.categoryId || null,
        isTotalBudget: isTotal,
        period: "MONTHLY",
        amount: input.amount,
        carryOver: input.carryOver ?? false,
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
