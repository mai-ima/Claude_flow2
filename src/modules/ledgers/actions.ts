"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { requireLedgerMember, setActiveLedger } from "@/lib/ledger-access";
import { PLANS, canUse } from "@/lib/plans";
import type { PlanTier } from "@/lib/enums";

async function userTier(userId: string): Promise<PlanTier> {
  const b = await db.billingProfile.findUnique({ where: { userId } });
  return (b?.tier ?? "FREE") as PlanTier;
}

export const switchLedger = authedAction(
  z.object({ ledgerId: z.string() }),
  async ({ ledgerId }, user) => {
    await requireLedgerMember(ledgerId, user.id);
    await setActiveLedger(ledgerId);
    revalidatePath("/", "layout");
    return { ledgerId };
  },
);

export const createPod = authedAction(
  z.object({ name: z.string().min(1, "名前を入力してください。").max(40) }),
  async ({ name }, user) => {
    // ファミリー共有は PLUS 以上の機能（サーバー側でも認可）
    if (!canUse(await userTier(user.id), "familySharing")) {
      throw new Error("PLAN_REQUIRED");
    }
    const ledger = await db.ledger.create({
      data: {
        name,
        type: "POD",
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    await setActiveLedger(ledger.id);
    revalidatePath("/", "layout");
    return { id: ledger.id };
  },
);

export const inviteMember = authedAction(
  z.object({
    ledgerId: z.string(),
    email: z.string().email("メールアドレスの形式が正しくありません。"),
    role: z.enum(["EDITOR", "VIEWER"]).default("EDITOR"),
  }),
  async ({ ledgerId, email, role }, user) => {
    await requireLedgerMember(ledgerId, user.id, "OWNER");

    const normalized = email.trim().toLowerCase();
    const invitee = await db.user.findUnique({ where: { email: normalized } });
    if (!invitee) {
      // 簡易招待: 既存ユーザーのみ。未登録は招待レコードを作らずエラー表示。
      throw new Error("USER_NOT_FOUND");
    }

    const existing = await db.ledgerMember.findUnique({
      where: { ledgerId_userId: { ledgerId, userId: invitee.id } },
    });

    // 新規追加時のみ人数上限を判定（既存メンバーの役割変更は対象外）
    if (!existing) {
      const max = PLANS[await userTier(user.id)].maxMembers;
      const count = await db.ledgerMember.count({ where: { ledgerId } });
      if (count >= max) {
        throw new Error("MEMBER_LIMIT");
      }
    }

    await db.ledgerMember.upsert({
      where: { ledgerId_userId: { ledgerId, userId: invitee.id } },
      create: { ledgerId, userId: invitee.id, role },
      update: { role },
    });
    revalidatePath("/settings");
    return { ok: true };
  },
);

export const removeMember = authedAction(
  z.object({ ledgerId: z.string(), userId: z.string() }),
  async ({ ledgerId, userId }, user) => {
    await requireLedgerMember(ledgerId, user.id, "OWNER");
    const ledger = await db.ledger.findUnique({ where: { id: ledgerId } });
    if (ledger?.ownerId === userId) throw new Error("CANNOT_REMOVE_OWNER");
    await db.ledgerMember.delete({
      where: { ledgerId_userId: { ledgerId, userId } },
    });
    revalidatePath("/settings");
    return { ok: true };
  },
);
