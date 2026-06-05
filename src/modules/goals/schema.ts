import { z } from "zod";

export const goalInput = z.object({
  name: z.string().min(1, "目標名を入力してください。").max(40),
  targetAmount: z.coerce.number().int().positive("目標額を入力してください。"),
  deadline: z.coerce.date().optional().nullable(),
  color: z.string().default("blue"),
  // 自動積立（任意）。amount>0 かつ day 指定で有効。
  autoContributionAmount: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
  autoContributionDay: z.coerce.number().int().min(1).max(28).optional().nullable(),
});
export type GoalInput = z.infer<typeof goalInput>;

export const updateGoalInput = goalInput.extend({ id: z.string() });
export const idInput = z.object({ id: z.string() });
export const contributeInput = z.object({
  id: z.string(),
  // 増減どちらも許容するが、極端値は弾く（API 直叩き対策）。
  amount: z.coerce.number().int().min(-100_000_000).max(100_000_000),
});
