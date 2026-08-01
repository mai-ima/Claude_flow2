import { z } from "zod";
import { MemberRole } from "@/lib/enums";

/** 精算の記録。「誰が誰にいくら渡したか」だけを持つ。 */
export const settlementInput = z.object({
  fromUserId: z.string().min(1, "払った方を選んでください。"),
  toUserId: z.string().min(1, "受け取る方を選んでください。"),
  amount: z.coerce.number().int("整数で入力してください。").positive("金額を入力してください。"),
  settledAt: z.coerce.date(),
  memo: z.string().max(200).optional().nullable(),
});
export type SettlementInput = z.infer<typeof settlementInput>;

export const deleteSettlementInput = z.object({ id: z.string() });

/**
 * 負担の重み。
 * 0 は「この人は負担しない」を表せるので許す。上限は 1000（それ以上の比を
 * 家計で使う場面が無く、桁を打ち間違えたときに気づけなくなる）。
 */
export const shareRatioInput = z.object({
  ledgerId: z.string(),
  ratios: z
    .array(z.object({ userId: z.string(), shareRatio: z.coerce.number().int().min(0).max(1000) }))
    .min(1, "対象がありません。"),
});

/** メンバーの権限。オーナーはこの経路では設定しない（譲渡は別の操作）。 */
export const memberRoleInput = z.object({
  ledgerId: z.string(),
  userId: z.string(),
  role: MemberRole.exclude(["OWNER"]),
});
