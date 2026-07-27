import "server-only";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import type { PlanTier } from "@/lib/enums";

/**
 * 帳簿の人数上限。
 *
 * 判定は必ず「帳簿オーナーの tier」で行う。画面を開いた人の tier を使うと、
 * 同じ帳簿でも FREE のメンバーが見たときだけ上限1人に見える、といった
 * 食い違いが起きる（招待側と表示側で基準が割れていた）。
 */
export async function ledgerMemberLimit(ownerId: string): Promise<number> {
  const billing = await db.billingProfile.findUnique({
    where: { userId: ownerId },
    select: { tier: true },
  });
  return PLANS[(billing?.tier ?? "FREE") as PlanTier].maxMembers;
}
