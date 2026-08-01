"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import {
  getActiveLedgerId,
  requireLedgerMember,
  requireOwnRecordOrEditor,
  assertLedgerOwnedRefs,
} from "@/lib/ledger-access";
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
  savedSearchInput,
  deleteSavedSearchInput,
  tagInput,
  updateTagInput,
  deleteTagInput,
  setTransactionTagsInput,
  assetSnapshotInput,
  deleteAssetSnapshotInput,
} from "./schema";

export const createTransaction = authedAction(
  transactionInput,
  async (input, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    // 追加は SELF_EDITOR でもできる。制限がかかるのは既存の記録を直すとき。
    await requireLedgerMember(ledgerId, user.id, "SELF_EDITOR");
    await assertLedgerOwnedRefs(ledgerId, input);
    const txn = await db.transaction.create({
      data: {
        ledgerId,
        createdByUserId: user.id,
        paidByUserId: input.paidByUserId || null,
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
    revalidatePath("/settlement");
    return { id: txn.id };
  },
);

export const updateTransaction = authedAction(
  updateTransactionInput,
  async (input, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await assertLedgerOwnedRefs(ledgerId, input);
    const existing = await db.transaction.findUnique({ where: { id: input.id } });
    if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
    // 権限の判定は対象の記録を見てから。SELF_EDITOR は自分の記録だけ。
    await requireOwnRecordOrEditor(ledgerId, user.id, existing.createdByUserId);
    await db.transaction.update({
      where: { id: input.id },
      data: {
        type: input.type,
        amount: input.amount,
        occurredAt: input.occurredAt,
        categoryId: input.categoryId || null,
        paymentMethodId: input.paymentMethodId || null,
        paidByUserId: input.paidByUserId || null,
        memo: input.memo || null,
      },
    });
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/settlement");
    return { id: input.id };
  },
);

export const deleteTransaction = authedAction(
  deleteTransactionInput,
  async ({ id }, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    const existing = await db.transaction.findUnique({ where: { id } });
    if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
    await requireOwnRecordOrEditor(ledgerId, user.id, existing.createdByUserId);
    await db.transaction.delete({ where: { id } });
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/settlement");
    return { ok: true };
  },
);

// ── 一括操作（すべて ledgerId スコープで越境を防止）──
export const bulkDeleteTransactions = authedAction(bulkDeleteInput, async ({ ids }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  const member = await requireLedgerMember(ledgerId, user.id, "SELF_EDITOR");
  // SELF_EDITOR は自分が入れたものだけ。where で絞る（1件ずつ確認して
  // 弾くより、そもそも対象に入れないほうが取りこぼさない）。
  const { count } = await db.transaction.deleteMany({
    where: {
      id: { in: ids },
      ledgerId,
      ...(member.role === "SELF_EDITOR" ? { createdByUserId: user.id } : {}),
    },
  });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/settlement");
  return { count };
});

export const bulkUpdateTransactions = authedAction(bulkUpdateInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  const member = await requireLedgerMember(ledgerId, user.id, "SELF_EDITOR");
  await assertLedgerOwnedRefs(ledgerId, input);
  const data: {
    categoryId?: string | null;
    paymentMethodId?: string | null;
    paidByUserId?: string | null;
  } = {};
  if (input.categoryId !== undefined) data.categoryId = input.categoryId || null;
  if (input.paymentMethodId !== undefined) data.paymentMethodId = input.paymentMethodId || null;
  if (input.paidByUserId !== undefined) data.paidByUserId = input.paidByUserId || null;
  const { count } = await db.transaction.updateMany({
    where: {
      id: { in: input.ids },
      ledgerId,
      ...(member.role === "SELF_EDITOR" ? { createdByUserId: user.id } : {}),
    },
    data,
  });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/settlement");
  return { count };
});

// ── 繰り返し（定期）取引 ──
export const createRecurring = authedAction(recurringInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "SELF_EDITOR");
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
  await assertLedgerOwnedRefs(ledgerId, input);
  const existing = await db.recurringTransaction.findUnique({ where: { id: input.id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await requireOwnRecordOrEditor(ledgerId, user.id, existing.createdByUserId);
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
  const existing = await db.recurringTransaction.findUnique({ where: { id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await requireOwnRecordOrEditor(ledgerId, user.id, existing.createdByUserId);
  await db.recurringTransaction.update({ where: { id }, data: { active } });
  revalidatePath("/transactions/recurring");
  return { ok: true };
});

export const deleteRecurring = authedAction(deleteRecurringInput, async ({ id }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  const existing = await db.recurringTransaction.findUnique({ where: { id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await requireOwnRecordOrEditor(ledgerId, user.id, existing.createdByUserId);
  await db.recurringTransaction.delete({ where: { id } });
  revalidatePath("/transactions/recurring");
  return { ok: true };
});

// ── 保存した検索 ──

/**
 * いまの絞り込みに名前を付けて保存する。
 * 保存は個人単位。共有帳簿でも、他の人の一覧には出ない。
 */
export const saveSearch = authedAction(savedSearchInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id);

  // 同じ名前が並ぶと、どれを押せばよいか分からなくなる。上書きする。
  const existing = await db.savedSearch.findFirst({
    where: { ledgerId, userId: user.id, name: input.name },
  });
  if (existing) {
    await db.savedSearch.update({ where: { id: existing.id }, data: { query: input.query } });
    revalidatePath("/transactions");
    return { id: existing.id };
  }

  // 際限なく増やさない。20件を超えたら古いものから消す。
  const count = await db.savedSearch.count({ where: { ledgerId, userId: user.id } });
  if (count >= 20) {
    const oldest = await db.savedSearch.findFirst({
      where: { ledgerId, userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    if (oldest) await db.savedSearch.delete({ where: { id: oldest.id } });
  }

  const row = await db.savedSearch.create({
    data: { ledgerId, userId: user.id, name: input.name, query: input.query },
  });
  revalidatePath("/transactions");
  return { id: row.id };
});

export const deleteSavedSearch = authedAction(deleteSavedSearchInput, async ({ id }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  const row = await db.savedSearch.findUnique({ where: { id } });
  // 他人の保存を消せないよう、帳簿と持ち主の両方を見る。
  if (!row || row.ledgerId !== ledgerId || row.userId !== user.id) throw new Error("FORBIDDEN");
  await db.savedSearch.delete({ where: { id } });
  revalidatePath("/transactions");
  return { ok: true };
});

// ── タグ ──

export const createTag = authedAction(tagInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const name = input.name.trim();
  // 同じ名前のタグが2つあると、どちらに貼ったか分からなくなる。
  // 一意制約もあるが、先に見て日本語のメッセージで返す。
  const dup = await db.tag.findFirst({ where: { ledgerId, name } });
  if (dup) throw new Error("TAG_DUPLICATE");
  const tag = await db.tag.create({ data: { ledgerId, name, color: input.color } });
  revalidatePath("/transactions");
  revalidatePath("/settings", "layout");
  return { id: tag.id };
});

export const updateTag = authedAction(updateTagInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const existing = await db.tag.findUnique({ where: { id: input.id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  const name = input.name.trim();
  const dup = await db.tag.findFirst({ where: { ledgerId, name, NOT: { id: input.id } } });
  if (dup) throw new Error("TAG_DUPLICATE");
  await db.tag.update({ where: { id: input.id }, data: { name, color: input.color } });
  revalidatePath("/transactions");
  revalidatePath("/settings", "layout");
  return { ok: true };
});

/** タグを消す。貼ってあった取引は残り、タグだけが外れる。 */
export const deleteTag = authedAction(deleteTagInput, async ({ id }, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  const existing = await db.tag.findUnique({ where: { id } });
  if (!existing || existing.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
  await db.tag.delete({ where: { id } });
  revalidatePath("/transactions");
  revalidatePath("/settings", "layout");
  return { ok: true };
});

/** 取引に貼るタグを丸ごと置き換える。 */
export const setTransactionTags = authedAction(
  setTransactionTagsInput,
  async ({ transactionId, tagIds }, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    const txn = await db.transaction.findUnique({ where: { id: transactionId } });
    if (!txn || txn.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
    await requireOwnRecordOrEditor(ledgerId, user.id, txn.createdByUserId);

    // 他の帳簿のタグを貼れないようにする。貼れると、一覧に出ないタグが
    // 付いた取引ができて、外す手段が無くなる。
    if (tagIds.length > 0) {
      const owned = await db.tag.count({ where: { ledgerId, id: { in: tagIds } } });
      if (owned !== new Set(tagIds).size) throw new Error("FORBIDDEN");
    }

    await db.$transaction([
      db.transactionTag.deleteMany({ where: { transactionId } }),
      ...(tagIds.length > 0
        ? [db.transactionTag.createMany({ data: tagIds.map((tagId) => ({ transactionId, tagId })) })]
        : []),
    ]);
    revalidatePath("/transactions");
    return { ok: true };
  },
);

// ── 資産スナップショット ──

/**
 * その月の資産額を記録する。月ごとに1件へ畳む。
 * 同じ月に2件あると、どちらが正しい残高なのか決まらない。
 */
export const setAssetSnapshot = authedAction(assetSnapshotInput, async (input, user) => {
  const ledgerId = await getActiveLedgerId(user.id);
  await requireLedgerMember(ledgerId, user.id, "EDITOR");
  // 月初へ丸める。日付が混ざると同じ月で別の行になる。
  const month = new Date(input.month.getFullYear(), input.month.getMonth(), 1);
  const row = await db.assetSnapshot.upsert({
    where: { ledgerId_month: { ledgerId, month } },
    create: { ledgerId, month, amount: input.amount, memo: input.memo || null },
    update: { amount: input.amount, memo: input.memo || null },
  });
  revalidatePath("/reports");
  return { id: row.id };
});

export const deleteAssetSnapshot = authedAction(
  deleteAssetSnapshotInput,
  async ({ id }, user) => {
    const ledgerId = await getActiveLedgerId(user.id);
    await requireLedgerMember(ledgerId, user.id, "EDITOR");
    const row = await db.assetSnapshot.findUnique({ where: { id } });
    if (!row || row.ledgerId !== ledgerId) throw new Error("FORBIDDEN");
    await db.assetSnapshot.delete({ where: { id } });
    revalidatePath("/reports");
    return { ok: true };
  },
);
