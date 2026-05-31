import { z } from "zod";

export const transactionInput = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().int("整数で入力してください。").positive("金額を入力してください。"),
  occurredAt: z.coerce.date(),
  categoryId: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  memo: z.string().max(200).optional().nullable(),
});
export type TransactionInput = z.infer<typeof transactionInput>;

export const updateTransactionInput = transactionInput.extend({
  id: z.string(),
});

export const deleteTransactionInput = z.object({ id: z.string() });
