"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminAction } from "@/lib/safe-action";
import { AdminRole } from "@/lib/admin-role";
import { writeAudit } from "./audit";
import { runReminders } from "@/lib/run-reminders";

/**
 * 取り違えると取り返しがつかない操作には、対象のメールアドレス入力を要求する。
 * 一覧から確認1回で他人のアカウントを消せる状態を避ける。
 */
const confirmEmail = z.string().min(1, "確認のためメールアドレスを入力してください。");
const reason = z.string().trim().min(1, "理由を入力してください。").max(200);

async function loadTarget(userId: string) {
  const target = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      isAdmin: true,
      adminRole: true,
      billing: { select: { tier: true } },
    },
  });
  if (!target) throw new Error("NOT_FOUND");
  return target;
}

/** 入力されたメールが対象と一致することを確かめる。 */
function assertConfirmed(target: { email: string | null }, input: string) {
  if ((target.email ?? "").trim().toLowerCase() !== input.trim().toLowerCase()) {
    throw new Error("CONFIRM_MISMATCH");
  }
}

export const setUserTier = adminAction(
  "SUPER",
  z.object({
    userId: z.string(),
    tier: z.enum(["FREE", "PLUS", "PRO"]),
    reason,
  }),
  async (input, user) => {
    const target = await loadTarget(input.userId);
    const before = target.billing?.tier ?? "FREE";

    await db.billingProfile.upsert({
      where: { userId: input.userId },
      create: { userId: input.userId, tier: input.tier },
      update: { tier: input.tier },
    });
    await writeAudit({
      actor: user,
      action: "USER_TIER_CHANGE",
      targetType: "USER",
      targetId: input.userId,
      targetLabel: target.email ?? undefined,
      before: { tier: before },
      after: { tier: input.tier },
      reason: input.reason,
    });
    revalidatePath("/admin/users");
    return { ok: true };
  },
);

export const setAdminRole = adminAction(
  "SUPER",
  z.object({
    userId: z.string(),
    role: AdminRole,
    confirmEmail,
    reason,
  }),
  async (input, user) => {
    if (input.userId === user.id) throw new Error("SELF_FORBIDDEN");
    const target = await loadTarget(input.userId);
    assertConfirmed(target, input.confirmEmail);

    await db.user.update({
      where: { id: input.userId },
      // isAdmin をまだ見ているコードが残っているため、必ず同期させる。
      data: { adminRole: input.role, isAdmin: input.role !== "NONE" },
    });
    await writeAudit({
      actor: user,
      action: "USER_ADMIN_ROLE_CHANGE",
      targetType: "USER",
      targetId: input.userId,
      targetLabel: target.email ?? undefined,
      before: { adminRole: target.adminRole, isAdmin: target.isAdmin },
      after: { adminRole: input.role, isAdmin: input.role !== "NONE" },
      reason: input.reason,
    });
    revalidatePath("/admin/users");
    return { role: input.role };
  },
);

export const deleteUser = adminAction(
  "SUPER",
  z.object({ userId: z.string(), confirmEmail, reason }),
  async (input, user) => {
    if (input.userId === user.id) throw new Error("SELF_FORBIDDEN");
    const target = await loadTarget(input.userId);
    assertConfirmed(target, input.confirmEmail);

    // 消してからでは何を消したのか分からなくなるため、先に証跡を残す。
    await writeAudit({
      actor: user,
      action: "USER_DELETE",
      targetType: "USER",
      targetId: input.userId,
      targetLabel: target.email ?? undefined,
      before: {
        email: target.email,
        adminRole: target.adminRole,
        tier: target.billing?.tier ?? "FREE",
      },
      reason: input.reason,
    });
    await db.user.delete({ where: { id: input.userId } });
    revalidatePath("/admin/users");
    return { ok: true };
  },
);

/**
 * 自動処理をいま実行する。
 * 実行できるのは全権のみ。誰がいつ回したかは監査ログに残す。
 */
export const runCronNow = adminAction("SUPER", z.object({}), async (_input, user) => {
  await writeAudit({
    actor: user,
    action: "CRON_RUN_MANUAL",
    targetType: "SYSTEM",
    targetLabel: "reminders",
  });
  const result = await runReminders("MANUAL", user.id);
  revalidatePath("/admin/ops");
  return result;
});
