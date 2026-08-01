import { z } from "zod";

export const transactionInput = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().int("整数で入力してください。").positive("金額を入力してください。"),
  occurredAt: z.coerce.date(),
  categoryId: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  /** 実際に払った人。共有帳簿の精算に使う。未指定なら立て替え無しの扱い。 */
  paidByUserId: z.string().optional().nullable(),
  memo: z.string().max(200).optional().nullable(),
});
export type TransactionInput = z.infer<typeof transactionInput>;

export const updateTransactionInput = transactionInput.extend({
  id: z.string(),
});

export const deleteTransactionInput = z.object({ id: z.string() });

// ── 一括操作 ──
export const bulkDeleteInput = z.object({
  ids: z.array(z.string()).min(1, "対象を選択してください。"),
});

export const bulkUpdateInput = z
  .object({
    ids: z.array(z.string()).min(1, "対象を選択してください。"),
    categoryId: z.string().optional().nullable(),
    paymentMethodId: z.string().optional().nullable(),
    paidByUserId: z.string().optional().nullable(),
  })
  .refine(
    (v) =>
      v.categoryId !== undefined ||
      v.paymentMethodId !== undefined ||
      v.paidByUserId !== undefined,
    { message: "変更する項目を指定してください。" },
  );

// ── 繰り返し（定期）取引 ──
export const recurringInput = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().int("整数で入力してください。").positive("金額を入力してください。"),
  cycle: z.enum(["MONTHLY", "YEARLY", "WEEKLY", "QUARTERLY"]),
  nextRunAt: z.coerce.date(),
  categoryId: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  memo: z.string().max(200).optional().nullable(),
});
export type RecurringInput = z.infer<typeof recurringInput>;

export const updateRecurringInput = recurringInput.extend({ id: z.string() });
export const deleteRecurringInput = z.object({ id: z.string() });
export const toggleRecurringInput = z.object({ id: z.string(), active: z.boolean() });
