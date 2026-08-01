"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authedAction, adminAction } from "@/lib/safe-action";
import { rateLimit } from "@/lib/rate-limit";
import { describeDevice } from "@/lib/user-agent";
import { APP_VERSION } from "@/lib/seo";
import { feedbackInput, updateFeedbackInput, deleteFeedbackInput } from "./schema";

/**
 * 要望・不具合を送る。
 *
 * ログインしている人だけが送れる。誰でも送れるようにすると、
 * 荒らしへの手当てに労力を取られ、本当に困っている人の声が埋もれる。
 */
export const sendFeedback = authedAction(feedbackInput, async (input, user) => {
  // 同じ人が短時間に何度も送るのを抑える。1時間に10件までなら、
  // まとめて報告したい人の邪魔にはならない。
  const rl = await rateLimit(`feedback:${user.id}`, 10, 3600, { memoryFallback: true });
  if (!rl.ok) throw new Error("TOO_MANY_REQUESTS");

  // 「どこで」「何で」起きたかが無いと、直すのに何往復も要る。
  const h = await headers();
  const ua = h.get("user-agent") ?? undefined;

  await db.feedback.create({
    data: {
      kind: input.kind,
      body: input.body,
      contactEmail: input.contactEmail || null,
      fromPath: input.fromPath || null,
      // 生の UA ではなく「iPhone の Safari」のような形にして持つ。
      // 端末を細かく特定できる文字列を、必要以上に残さない。
      userAgent: ua ? describeDevice(ua) : null,
      appVersion: APP_VERSION,
      userId: user.id,
    },
  });

  revalidatePath("/admin/feedback");
  return { ok: true };
});

/** 対応状況の更新（管理）。 */
export const updateFeedback = adminAction(
  "SUPPORT",
  updateFeedbackInput,
  async ({ id, status, adminNote }, user) => {
    const existing = await db.feedback.findUnique({ where: { id } });
    if (!existing) throw new Error("NOT_FOUND");
    await db.feedback.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote ?? null,
        // 誰がいつ触ったかを残す。あとから経緯を追えるようにする。
        handledByUserId: user.id,
        handledAt: new Date(),
      },
    });
    revalidatePath("/admin/feedback");
    return { ok: true };
  },
);

/**
 * 報告を消す（管理）。
 * 誤送信や、内容が空の投稿を片付けるためのもの。SUPER のみ。
 */
export const deleteFeedback = adminAction(
  "SUPER",
  deleteFeedbackInput,
  async ({ id }) => {
    await db.feedback.delete({ where: { id } });
    revalidatePath("/admin/feedback");
    return { ok: true };
  },
);
