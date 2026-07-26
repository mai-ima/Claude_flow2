"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { getActiveLedgerId, requireLedgerMember, assertLedgerOwnedRefs } from "@/lib/ledger-access";
import {
  transactionInput,
  updateTransactionInput,
  deleteTransactionInput,
  bulkDeleteInput,
  bulkUpdateInput,
  recurringInput,
  updateRecurringInput,
  deleteRecurringInput,
  toggleRecurringInput,
} from "./schema";

export const createTransaction = authedAction(
  transactionInput,
  async (input, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
    await assertLedgerOwnedRefs(ledgerId, input);
    const txn = await db.transaction.create({
      data: {
        ledgerId,
        createdByUserId: user.id,
        type: input.type,
        amount: input.amount,
        occurredAt: input.occurredAt,
        categoryId: input.categoryId || null,
        paymentMethodId: input.paymentMethodId || null,
        memo: input.memo || null,
      },
    });
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return { id: txn.id };
  },
);

export const updateTransaction = authedAction(
  updateTransactionInput,
  async (input, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
    await assertLedgerOwnedRefs(ledgerId, input);
    const existing = await db.transaction.findUnique({ where: { id: input.id } });
    if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
    await db.transaction.update({
      where: { id: input.id },
      data: {
        type: input.type,
        amount: input.amount,
        occurredAt: input.occurredAt,
        categoryId: input.categoryId || null,
        paymentMethodId: input.paymentMethodId || null,
        memo: input.memo || null,
      },
    });
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return { id: input.id };
  },
);

export const deleteTransaction = authedAction(
  deleteTransactionInput,
  async ({ id }, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
    const existing = await db.transaction.findUnique({ where: { id } });
    if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
    await db.transaction.delete({ where: { id } });
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return { ok: true };
  },
);

// ── 一括操作（すべて ledgerId スコープで越境を防止）──
export const bulkDeleteTransactions = authedAction(bulkDeleteInput, async ({ ids }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const { count } = await db.transaction.deleteMany({ where: { id: { in: ids }, ledgerId } });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { count };
});

export const bulkUpdateTransactions = authedAction(bulkUpdateInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  await assertLedgerOwnedRefs(ledgerId, input);
  const data: { categoryId?: string | null; paymentMethodId?: string | null } = {};
  if (input.categoryId !== undefined) data.categoryId = input.categoryId || null;
  if (input.paymentMethodId !== undefined) data.paymentMethodId = input.paymentMethodId || null;
  const { count } = await db.transaction.updateMany({
    where: { id: { in: input.ids }, ledgerId },
    data,
  });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { count };
});

// ── 繰り返し（定期）取引 ──
export const createRecurring = authedAction(recurringInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  await assertLedgerOwnedRefs(ledgerId, input);
  const r = await db.recurringTransaction.create({
    data: {
      ledgerId,
      createdByUserId: user.id,
      type: input.type,
      amount: input.amount,
      cycle: input.cycle,
      nextRunAt: input.nextRunAt,
      categoryId: input.categoryId || null,
      paymentMethodId: input.paymentMethodId || null,
      memo: input.memo || null,
    },
  });
  revalidatePath("/transactions/recurring");
  return { id: r.id };
});

export const updateRecurring = authedAction(updateRecurringInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  await assertLedgerOwnedRefs(ledgerId, input);
  const existing = await db.recurringTransaction.findUnique({ where: { id: input.id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await db.recurringTransaction.update({
    where: { id: input.id },
    data: {
      type: input.type,
      amount: input.amount,
      cycle: input.cycle,
      nextRunAt: input.nextRunAt,
      categoryId: input.categoryId || null,
      paymentMethodId: input.paymentMethodId || null,
      memo: input.memo || null,
    },
  });
  revalidatePath("/transactions/recurring");
  return { id: input.id };
});

export const toggleRecurring = authedAction(toggleRecurringInput, async ({ id, active }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const existing = await db.recurringTransaction.findUnique({ where: { id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await db.recurringTransaction.update({ where: { id }, data: { active } });
  revalidatePath("/transactions/recurring");
  return { ok: true };
});

export const deleteRecurring = authedAction(deleteRecurringInput, async ({ id }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const existing = await db.recurringTransaction.findUnique({ where: { id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await db.recurringTransaction.delete({ where: { id } });
  revalidatePath("/transactions/recurring");
  return { ok: true };
});
