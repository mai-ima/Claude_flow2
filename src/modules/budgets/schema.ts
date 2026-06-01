import { z } from "zod";

export const setBudgetInput = z.object({
  // categoryId 未指定なら全体予算
  categoryId: z.string().optional().nullable(),
  amount: z.coerce.number().int().positive("金額を入力してください。"),
});
export type SetBudgetInput = z.infer<typeof setBudgetInput>;

export const deleteBudgetInput = z.object({ id: z.string() });
