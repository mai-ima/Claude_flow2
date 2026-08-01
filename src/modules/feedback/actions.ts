"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authedAction, adminAction } from "@/lib/safe-action";
import { rateLimit } from "@/lib/rate-limit";
import { describeDevice } from "@/lib/user-agent";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { APP_VERSION, SITE } from "@/lib/seo";
import {
  feedbackInput,
  updateFeedbackInput,
  deleteFeedbackInput,
  replyFeedbackInput,
  bulkUpdateFeedbackInput,
  FEEDBACK_KIND_LABEL,
  type FeedbackKind,
} from "./schema";

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

  const created = await db.feedback.create({
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
    select: { id: true },
  });

  revalidatePath("/admin/feedback");
  revalidatePath("/settings/feedback");
  return { id: created.id };
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
    revalidatePath("/settings/feedback");
    return { ok: true };
  },
);

/**
 * まとめて対応状況を変える（管理）。
 *
 * 未読が溜まったときに1件ずつ選び直すのは現実的でない。
 * ただし返信は1件ずつしかできない（定型文を一斉に送るための機能にしない）。
 */
export const bulkUpdateFeedback = adminAction(
  "SUPPORT",
  bulkUpdateFeedbackInput,
  async ({ ids, status }, user) => {
    const res = await db.feedback.updateMany({
      where: { id: { in: ids } },
      data: { status, handledByUserId: user.id, handledAt: new Date() },
    });
    revalidatePath("/admin/feedback");
    revalidatePath("/settings/feedback");
    return { updated: res.count };
  },
);

/**
 * 送り主に返信する（管理）。
 *
 * 返信は3か所に届く: アプリ内の通知、送った報告の一覧、
 * 返信先を書いていればメール。どれか1つに頼ると、その経路を
 * 見ていない人には届かない。
 */
export const replyFeedback = adminAction(
  "SUPPORT",
  replyFeedbackInput,
  async ({ id, replyBody, status }, user) => {
    const existing = await db.feedback.findUnique({
      where: { id },
      select: { id: true, kind: true, body: true, userId: true, contactEmail: true },
    });
    if (!existing) throw new Error("NOT_FOUND");

    await db.feedback.update({
      where: { id },
      data: {
        replyBody,
        repliedAt: new Date(),
        // 返信したなら、たいていは対応が済んでいる。ただし
        // 「確認中だが途中経過を伝える」もあるので指定は受ける。
        status: status ?? "DONE",
        handledByUserId: user.id,
        handledAt: new Date(),
      },
    });

    // アプリ内の通知。退会していれば送り先が無いので作らない。
    if (existing.userId) {
      await db.notification.create({
        data: {
          userId: existing.userId,
          type: "FEEDBACK",
          title: "お送りいただいたご報告に返信があります",
          body:
            replyBody.length > 120 ? `${replyBody.slice(0, 120)}…` : replyBody,
          href: "/settings/feedback",
        },
      });
    }

    // メールは「返信を希望する」と書いた人にだけ送る。
    // 送信できなくても返信そのものは残す（アプリ内では読める）。
    if (existing.contactEmail) {
      try {
        await sendEmail({
          to: existing.contactEmail,
          subject: `【${SITE.name}】お送りいただいたご報告への返信`,
          kind: "FEEDBACK",
          html: replyEmailHtml({
            kind: existing.kind as FeedbackKind,
            original: existing.body,
            reply: replyBody,
          }),
        });
      } catch (err) {
        logger.error("feedback reply mail failed", err, { id });
      }
    }

    await writeAudit({
      actor: user,
      action: "FEEDBACK_REPLY",
      targetType: "SYSTEM",
      targetId: id,
      targetLabel: "ご意見・不具合の報告",
      after: { 返信あり: true, 対応状況: status ?? "DONE" },
    });

    revalidatePath("/admin/feedback");
    revalidatePath("/settings/feedback");
    return { ok: true };
  },
);

/**
 * 報告を消す（管理）。
 * 誤送信や、内容が空の投稿を片付けるためのもの。SUPER のみ。
 */
export const deleteFeedback = adminAction("SUPER", deleteFeedbackInput, async ({ id }, user) => {
  const existing = await db.feedback.findUnique({
    where: { id },
    select: { body: true },
  });
  await db.feedback.delete({ where: { id } });

  // 何を消したのかが分からないと、あとから「届いたはずの報告」を
  // 追えない。冒頭だけ証跡に残す。
  await writeAudit({
    actor: user,
    action: "FEEDBACK_DELETE",
    targetType: "SYSTEM",
    targetId: id,
    targetLabel: "ご意見・不具合の報告",
    before: existing
      ? { 本文の冒頭: existing.body.slice(0, 80) }
      : undefined,
  });

  revalidatePath("/admin/feedback");
  revalidatePath("/settings/feedback");
  return { ok: true };
});

/** 返信メールの本文。装飾は最小限にして、書いた文がそのまま読めることを優先する。 */
function replyEmailHtml({
  kind,
  original,
  reply,
}: {
  kind: FeedbackKind;
  original: string;
  reply: string;
}): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  return `
    <div style="font-family:sans-serif;line-height:1.8;color:#111">
      <p>${SITE.name} をご利用いただきありがとうございます。</p>
      <p>お送りいただいたご報告（${FEEDBACK_KIND_LABEL[kind] ?? "その他"}）について、以下のとおりお返事いたします。</p>
      <div style="border-left:3px solid #ddd;padding:8px 0 8px 12px;margin:16px 0">${esc(reply)}</div>
      <p style="color:#666;font-size:13px">いただいた内容:</p>
      <div style="color:#666;font-size:13px;border-left:3px solid #eee;padding:8px 0 8px 12px">${esc(original)}</div>
      <p style="color:#666;font-size:12px;margin-top:24px">
        このメールは、ご報告の際に返信先をご記入いただいた方にお送りしています。
      </p>
    </div>
  `;
}
