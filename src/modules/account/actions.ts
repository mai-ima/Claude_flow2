"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { getActiveLedgerId, requireLedgerMember } from "@/lib/ledger-access";
import { signOut } from "@/lib/auth";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { isBetaFeatureKey, enabledBetaFeatures } from "@/lib/beta-features";
import { Prisma } from "@/generated/prisma";

export const updateProfile = authedAction(
  z.object({
    // 空欄での保存は「名前を消したい」ではなく入力漏れとして扱い、
    // 黙って無視せずエラーを返す（以前は undefined になり更新がスキップされ、
    // それでも「保存しました」と表示されていた）。
    name: z.string().trim().min(1, "お名前を入力してください。").max(40),
    assumedHourlyWage: z.coerce.number().int().min(0).max(1_000_000).optional(),
  }),
  async (input, user) => {
    await db.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        assumedHourlyWage: input.assumedHourlyWage ?? null,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true };
  },
);

/**
 * 親スイッチの切り替え。
 * オンにするときは、それまでの個別設定を引き継ぐ（未設定なら全機能を有効に倒す）。
 */
export const updateBetaOptIn = authedAction(
  z.object({ enabled: z.coerce.boolean() }),
  async ({ enabled }, user) => {
    await db.user.update({
      where: { id: user.id },
      data: {
        betaOptIn: enabled,
        // 個別に全部オフのまま親をオンにすると何も起きず、壊れて見える。
        // その場合だけ「全機能オン」に倒す。
        ...(enabled && Array.isArray(user.betaFeatures) && user.betaFeatures.length === 0
          ? { betaFeatures: Prisma.DbNull }
          : {}),
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  },
);

/** 個別のベータ機能を1つだけ切り替える。 */
export const updateBetaFeature = authedAction(
  z.object({ key: z.string(), enabled: z.coerce.boolean() }),
  async ({ key, enabled }, user) => {
    if (!isBetaFeatureKey(key)) {
      return { ok: false as const, error: "不明な機能です。" };
    }
    // 未指定(null)は「親スイッチがオンなら全て有効」を意味する。
    // 親を見ずに展開すると、親オフの状態で1つ入れたときに全機能が点いてしまう。
    const current = enabledBetaFeatures({
      optIn: user.betaOptIn,
      features: user.betaFeatures,
    });
    const next = enabled
      ? [...new Set([...current, key])]
      : current.filter((k) => k !== key);

    await db.user.update({
      where: { id: user.id },
      data: {
        betaFeatures: next,
        // 1つでもオンにしたなら親スイッチも入れる（個別操作だけで使えるように）。
        ...(enabled ? { betaOptIn: true } : {}),
      },
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { features: next } };
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
