"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";

export const setUserTier = authedAction(
  z.object({ userId: z.string(), tier: z.enum(["FREE", "PLUS", "PRO"]) }),
  async ({ userId, tier }, user) => {
    if (!user.isAdmin) throw new Error("FORBIDDEN");
    await db.billingProfile.upsert({
      where: { userId },
      create: { userId, tier },
      update: { tier },
    });
    revalidatePath("/admin/users");
    return { ok: true };
  },
);

export const toggleAdmin = authedAction(
  z.object({ userId: z.string() }),
  async ({ userId }, user) => {
    if (!user.isAdmin) throw new Error("FORBIDDEN");
    if (userId === user.id) throw new Error("SELF_FORBIDDEN");
    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) throw new Error("NOT_FOUND");
    await db.user.update({ where: { id: userId }, data: { isAdmin: !target.isAdmin } });
    revalidatePath("/admin/users");
    return { isAdmin: !target.isAdmin };
  },
);

export const deleteUser = authedAction(
  z.object({ userId: z.string() }),
  async ({ userId }, user) => {
    if (!user.isAdmin) throw new Error("FORBIDDEN");
    if (userId === user.id) throw new Error("SELF_FORBIDDEN");
    await db.user.delete({ where: { id: userId } });
    revalidatePath("/admin/users");
    return { ok: true };
  },
);
