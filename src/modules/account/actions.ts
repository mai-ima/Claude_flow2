"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { getActiveLedgerId, requireLedgerMember } from "@/lib/ledger-access";
import { signOut } from "@/lib/auth";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";

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

export const updateBetaOptIn = authedAction(
  z.object({ enabled: z.coerce.boolean() }),
  async ({ enabled }, user) => {
    await db.user.update({ where: { id: user.id }, data: { betaOptIn: enabled } });
    revalidatePath("/", "layout");
    return { ok: true };
  },
);

export const updateAlphaOptIn = authedAction(
  z.object({ enabled: z.coerce.boolean() }),
  async ({ enabled }, user) => {
    await db.user.update({ where: { id: user.id }, data: { alphaOptIn: enabled } });
    revalidatePath("/", "layout");
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

/**
 * アクティブな帳簿の全データを削除して初期状態に戻す（アカウントは残す）。
 * 取引・サブスク・予算・目標・支払い方法を消し、カテゴリを既定値で再生成する。
 */
export const deleteAllDataAction = authedAction(z.object({}), async (_input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "OWNER");
  // 依存関係の順に削除（取引→サブスク/予算/目標→支払い方法→カテゴリ）→ 既定カテゴリを再生成。
  await db.$transaction([
    db.transaction.deleteMany({ where: { ledgerId } }),
    db.subscription.deleteMany({ where: { ledgerId } }),
    db.budget.deleteMany({ where: { ledgerId } }),
    db.goal.deleteMany({ where: { ledgerId } }),
    db.paymentMethod.deleteMany({ where: { ledgerId } }),
    db.category.deleteMany({ where: { ledgerId } }),
    db.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, ledgerId })),
    }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
});

/** アカウント削除（関連データもカスケード削除）。遷移はクライアント側で行う。 */
export const deleteAccountAction = authedAction(z.object({}), async (_input, user) => {
  await db.user.delete({ where: { id: user.id } });
  await signOut();
  return { ok: true };
});
