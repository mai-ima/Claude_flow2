"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authedAction } from "@/lib/safe-action";
import { z } from "zod";

export const markAllRead = authedAction(z.object({}), async (_input, user) => {
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { ok: true };
});

export const markRead = authedAction(z.object({ id: z.string() }), async ({ id }, user) => {
  await db.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { ok: true };
});
