"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { getActiveLedgerId, requireLedgerMember } from "@/lib/ledger-access";

export const updateProfile = authedAction(
  z.object({
    name: z.string().max(40).optional(),
    assumedHourlyWage: z.coerce.number().int().min(0).max(1_000_000).optional(),
  }),
  async (input, user) => {
    await db.user.update({
      where: { id: user.id },
      data: {
        name: input.name?.trim() || undefined,
        assumedHourlyWage: input.assumedHourlyWage ?? null,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true };
  },
);

export const createPaymentMethod = authedAction(
  z.object({
    name: z.string().min(1, "名前を入力してください。").max(40),
    type: z.enum(["CARD", "BANK", "CASH", "EMONEY"]),
    color: z.string().default("blue"),
  }),
  async (input, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
    await db.paymentMethod.create({
      data: { ledgerId, name: input.name, type: input.type, color: input.color, icon: "card" },
    });
    revalidatePath("/settings");
    return { ok: true };
  },
);

export const deletePaymentMethod = authedAction(
  z.object({ id: z.string() }),
  async ({ id }, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
    const pm = await db.paymentMethod.findUnique({ where: { id } });
    if (!pm || pm.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
    await db.paymentMethod.delete({ where: { id } });
    revalidatePath("/settings");
    return { ok: true };
  },
);
