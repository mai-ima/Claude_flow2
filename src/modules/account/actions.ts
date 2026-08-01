"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { getActiveLedgerId, requireLedgerMember } from "@/lib/ledger-access";
import {
  signOut,
  changePassword,
  revokeSession,
  revokeOtherSessions,
  assertPassword,
} from "@/lib/auth";
import {
  beginTwoFactorSetup,
  confirmTwoFactor,
  disableTwoFactor,
  regenerateRecoveryCodes,
} from "@/lib/two-factor";
import { sendEmailVerification } from "@/lib/account-mail";
import { isEmailEnabled } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { isBetaFeatureKey, enabledBetaFeatures } from "@/lib/beta-features";
import { canSetParent } from "@/lib/category-tree";
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
    /** 親カテゴリ。指定するとサブカテゴリになる。 */
    parentId: z.string().optional(),
  }),
  async (input, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");

    let parentId: string | null = null;
    if (input.parentId) {
      const siblings = await db.category.findMany({
        where: { ledgerId },
        select: { id: true, name: true, parentId: true, type: true },
      });
      const parent = siblings.find((c) => c.id === input.parentId);
      // 収入のカテゴリを支出の下に置くと、集計がどちらに入るのか決まらない。
      if (!parent || parent.type !== input.type) throw new Error("PARENT_TYPE_MISMATCH");
      // 深さの制限はここでも見る。画面だけの制限は API を直接叩けば抜けられる。
      const verdict = canSetParent(siblings, "new", input.parentId);
      if (!verdict.ok) throw new Error("PARENT_INVALID");
      parentId = input.parentId;
    }

    await db.category.create({
      data: {
        ledgerId,
        name: input.name,
        type: input.type,
        icon: input.icon,
        color: input.color,
        parentId,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/transactions");
    return { ok: true };
  },
);

/** 既存カテゴリの親を変える（サブカテゴリにする／親に戻す）。 */
export const setCategoryParent = authedAction(
  z.object({ id: z.string(), parentId: z.string().nullable() }),
  async ({ id, parentId }, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");

    const categories = await db.category.findMany({
      where: { ledgerId },
      select: { id: true, name: true, parentId: true, type: true },
    });
    const self = categories.find((c) => c.id === id);
    if (!self) throw new Error("NOT_FOUND");

    if (parentId) {
      const parent = categories.find((c) => c.id === parentId);
      if (!parent || parent.type !== self.type) throw new Error("PARENT_TYPE_MISMATCH");
    }
    const verdict = canSetParent(categories, id, parentId);
    if (!verdict.ok) throw new Error("PARENT_INVALID");

    await db.category.update({ where: { id }, data: { parentId } });
    revalidatePath("/settings");
    revalidatePath("/transactions");
    revalidatePath("/reports");
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

/**
 * パスワードの変更。
 * 成功すると今の端末以外のログインは全て切れる（changePassword 側で実施）。
 */
export const changePasswordAction = authedAction(
  z
    .object({
      currentPassword: z.string().min(1, "現在のパスワードを入力してください。"),
      newPassword: z.string().min(8, "新しいパスワードは8文字以上で入力してください。"),
      confirmPassword: z.string().min(1, "確認のため、もう一度入力してください。"),
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
      path: ["confirmPassword"],
      message: "新しいパスワードが一致しません。",
    }),
  async (input, user) => {
    await changePassword(user.id, input.currentPassword, input.newPassword);
    revalidatePath("/settings");
    return { ok: true };
  },
);

/**
 * 確認メールの再送。
 * 送信が未設定の環境では、届かないメールを待たせないよう素直に断る。
 */
export const sendVerificationEmailAction = authedAction(z.object({}), async (_input, user) => {
  if (!user.email) throw new Error("NO_EMAIL");
  if (!isEmailEnabled) throw new Error("EMAIL_DISABLED");

  const fresh = await db.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true },
  });
  if (fresh?.emailVerified) return { alreadyVerified: true };

  // 再送の連打で送信の踏み台にされないようにする。
  const rl = await rateLimit(`verify-send:${user.id}`, 3, 600, { memoryFallback: true });
  if (!rl.ok) throw new Error("TOO_MANY_REQUESTS");

  const { sent } = await sendEmailVerification(user.email);
  if (!sent) throw new Error("EMAIL_SEND_FAILED");
  return { alreadyVerified: false };
});

/** 二要素認証の設定を開始する。鍵と、認証アプリに読ませる文字列を返す。 */
export const beginTwoFactorAction = authedAction(z.object({}), async (_input, user) => {
  if (!user.email) throw new Error("NO_EMAIL");
  const { secret, uri } = await beginTwoFactorSetup(user.id, user.email);
  return { secret, uri };
});

/** 認証アプリのコードを照合して有効化する。復旧コードはこの一度だけ返す。 */
export const confirmTwoFactorAction = authedAction(
  z.object({ code: z.string().min(1, "コードを入力してください。") }),
  async (input, user) => {
    const codes = await confirmTwoFactor(user.id, input.code);
    revalidatePath("/settings");
    return { recoveryCodes: codes };
  },
);

/**
 * 二要素認証の解除。パスワードの確認を必須にする。
 * 端末を一時的に借りられただけで外せると、二要素にした意味が無くなる。
 */
export const disableTwoFactorAction = authedAction(
  z.object({ password: z.string().min(1, "パスワードを入力してください。") }),
  async (input, user) => {
    await assertPassword(user.id, input.password);
    await disableTwoFactor(user.id);
    revalidatePath("/settings");
    return { ok: true };
  },
);

/** 復旧コードの作り直し。こちらもパスワードの確認を必須にする。 */
export const regenerateRecoveryCodesAction = authedAction(
  z.object({ password: z.string().min(1, "パスワードを入力してください。") }),
  async (input, user) => {
    await assertPassword(user.id, input.password);
    const codes = await regenerateRecoveryCodes(user.id);
    revalidatePath("/settings");
    return { recoveryCodes: codes };
  },
);

/** 指定した端末のログインを終了する。 */
export const revokeSessionAction = authedAction(
  z.object({ sessionId: z.string().min(1) }),
  async (input, user) => {
    await revokeSession(user.id, input.sessionId);
    revalidatePath("/settings");
    return { ok: true };
  },
);

/** 今の端末以外のログインを全て終了する。 */
export const revokeOtherSessionsAction = authedAction(z.object({}), async (_input, user) => {
  const count = await revokeOtherSessions(user.id);
  revalidatePath("/settings");
  return { count };
});

/** アカウント削除（関連データもカスケード削除）。遷移はクライアント側で行う。 */
export const deleteAccountAction = authedAction(z.object({}), async (_input, user) => {
  // Ledger.ownerId は Cascade のままなので、オーナーが退会すると共有帳簿が
  // 丸ごと消え、他のメンバーの記録まで失われる。先に移譲か削除を求める。
  const ownedShared = await db.ledger.count({
    where: { ownerId: user.id, type: "POD", members: { some: { userId: { not: user.id } } } },
  });
  if (ownedShared > 0) throw new Error("OWNS_SHARED_LEDGER");

  await db.user.delete({ where: { id: user.id } });
  await signOut();
  return { ok: true };
});

/** 退会前の確認用。オーナーとして他メンバーを抱えている共有帳簿を返す。 */
export const listBlockingLedgers = authedAction(z.object({}), async (_input, user) => {
  const ledgers = await db.ledger.findMany({
    where: { ownerId: user.id, type: "POD", members: { some: { userId: { not: user.id } } } },
    select: { id: true, name: true, _count: { select: { members: true } } },
    orderBy: { createdAt: "asc" },
  });
  return {
    ledgers: ledgers.map((l) => ({ id: l.id, name: l.name, memberCount: l._count.members })),
  };
});
