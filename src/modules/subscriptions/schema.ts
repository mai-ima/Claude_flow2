import { z } from "zod";

export const subscriptionInput = z.object({
  name: z.string().min(1, "サービス名を入力してください。").max(60),
  amount: z.coerce.number().int().positive("金額を入力してください。"),
  cycle: z.enum(["MONTHLY", "YEARLY", "WEEKLY", "QUARTERLY"]),
  status: z.enum(["ACTIVE", "PAUSED", "CANCELED", "TRIAL"]).default("ACTIVE"),
  nextRenewalAt: z.coerce.date(),
  categoryId: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  reminderDaysBefore: z.coerce.number().int().min(0).max(30).default(3),
  autoPostTransaction: z.coerce.boolean().default(true),
  serviceKey: z.string().optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});
export type SubscriptionInput = z.infer<typeof subscriptionInput>;

export const updateSubscriptionInput = subscriptionInput.extend({ id: z.string() });
export const idInput = z.object({ id: z.string() });
export const markUsedInput = z.object({ id: z.string() });
export const reviewInput = z.object({
  id: z.string(),
  decision: z.enum(["KEEP", "REVIEW"]),
});
