"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { getActiveLedgerId, requireLedgerMember } from "@/lib/ledger-access";
import { getCurrentUser, signOut } from "@/lib/auth";

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

// ───────── カテゴリ管理 ─────────
export const createCategory = authedAction(
  z.object({
    name: z.string().min(1, "名前を入力してください。").max(20),
    type: z.enum(["INCOME", "EXPENSE"]),
    icon: z.string().default("tag"),
    color: z.string().default("gray"),
  }),
  async (input, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
    await db.category.create({
      data: { ledgerId, name: input.name, type: input.type, icon: input.icon, color: input.color },
    });
    revalidatePath("/settings");
    revalidatePath("/transactions");
    return { ok: true };
  },
);

export const toggleArchiveCategory = authedAction(
  z.object({ id: z.string(), archived: z.coerce.boolean() }),
  async ({ id, archived }, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
    const cat = await db.category.findUnique({ where: { id } });
    if (!cat || cat.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
    await db.category.update({ where: { id }, data: { isArchived: archived } });
    revalidatePath("/settings");
    revalidatePath("/transactions");
    return { ok: true };
  },
);

/** アカウント削除（関連データもカスケード削除）。完了後トップへ。 */
export async function deleteAccountAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await db.user.delete({ where: { id: user.id } });
  await signOut();
  redirect("/");
}
