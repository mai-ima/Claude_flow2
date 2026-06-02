import { z } from "zod";

export const goalInput = z.object({
  name: z.string().min(1, "目標名を入力してください。").max(40),
  targetAmount: z.coerce.number().int().positive("目標額を入力してください。"),
  deadline: z.coerce.date().optional().nullable(),
  color: z.string().default("blue"),
});
export type GoalInput = z.infer<typeof goalInput>;

export const updateGoalInput = goalInput.extend({ id: z.string() });
export const idInput = z.object({ id: z.string() });
export const contributeInput = z.object({
  id: z.string(),
  amount: z.coerce.number().int(),
});
