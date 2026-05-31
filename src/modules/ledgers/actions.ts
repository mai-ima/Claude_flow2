"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import {
  requireLedgerMember,
  setActiveLedger,
  getActiveLedgerId,
} from "@/lib/ledger-access";
import { PLANS } from "@/lib/plans";
import type { PlanTier } from "@/lib/enums";

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

    // 人数上限はオーナーのプランで判定
    const owner = await db.billingProfile.findUnique({ where: { userId: user.id } });
    const tier = (owner?.tier ?? "FREE") as PlanTier;
    const max = PLANS[tier].maxMembers;
    const count = await db.ledgerMember.count({ where: { ledgerId } });
    if (count >= max) {
      throw new Error("MEMBER_LIMIT");
    }

    const normalized = email.trim().toLowerCase();
    const invitee = await db.user.findUnique({ where: { email: normalized } });
    if (!invitee) {
      // 簡易招待: 既存ユーザーのみ。未登録は招待レコードを作らずエラー表示。
      throw new Error("USER_NOT_FOUND");
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
