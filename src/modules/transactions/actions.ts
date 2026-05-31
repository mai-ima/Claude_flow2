"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { getActiveLedgerId, requireLedgerMember } from "@/lib/ledger-access";
import {
  transactionInput,
  updateTransactionInput,
  deleteTransactionInput,
} from "./schema";

export const createTransaction = authedAction(
  transactionInput,
  async (input, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
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
