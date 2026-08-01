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

/**
 * お知らせを1件消す。
 *
 * 既読にするだけでは一覧から減らず、要らない知らせが溜まると
 * 本当に見たいものが埋もれる。where に userId を入れているのは、
 * id を知っているだけで他人の知らせを消せないようにするため。
 */
export const deleteNotification = authedAction(
  z.object({ id: z.string() }),
  async ({ id }, user) => {
    await db.notification.deleteMany({ where: { id, userId: user.id } });
    revalidatePath("/", "layout");
    return { ok: true };
  },
);

/**
 * 読んだお知らせをまとめて消す。
 *
 * 未読は消さない。「まとめて片付ける」つもりで押した人が、
 * まだ見ていない知らせまで失うことがないようにする。
 */
export const deleteReadNotifications = authedAction(z.object({}), async (_input, user) => {
  const res = await db.notification.deleteMany({
    where: { userId: user.id, readAt: { not: null } },
  });
  revalidatePath("/", "layout");
  return { deleted: res.count };
});
