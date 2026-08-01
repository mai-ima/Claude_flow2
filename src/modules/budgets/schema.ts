import { z } from "zod";

export const setBudgetInput = z.object({
  // categoryId 未指定なら全体予算
  categoryId: z.string().optional().nullable(),
  amount: z.coerce.number().int().positive("金額を入力してください。"),
  /** 前月の使い残しを当月に足すか。 */
  carryOver: z.coerce.boolean().optional(),
});
export type SetBudgetInput = z.infer<typeof setBudgetInput>;

export const deleteBudgetInput = z.object({ id: z.string() });
