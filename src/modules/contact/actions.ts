"use server";

import { z } from "zod";
import { sendEmail, emailLayout } from "@/lib/email";
import { CONTACT } from "@/lib/seo";
import { logger } from "@/lib/logger";

// 公開（未認証）フォームのため authedAction は使わず、ここで検証・例外処理を行う。
const schema = z.object({
  category: z.enum(["support", "feedback", "privacy"]),
  name: z.string().trim().min(1, "お名前を入力してください。").max(60),
  email: z.string().trim().email("メールアドレスの形式が正しくありません。"),
  message: z.string().trim().min(10, "10文字以上でご記入ください。").max(2000),
});

const CATEGORY_LABEL = {
  support: "サポート",
  feedback: "ご要望・ご意見",
  privacy: "プライバシー",
} as const;

const CATEGORY_TO = {
  support: CONTACT.support,
  feedback: CONTACT.feedback,
  privacy: CONTACT.privacy,
} as const;

export type ContactResult =
  | { ok: true; sent: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export async function submitContactMessage(raw: unknown): Promise<ContactResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return {
      ok: false,
      error: "入力内容をご確認ください。",
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    };
  }
  const { category, name, email, message } = parsed.data;
  try {
    const html = emailLayout(
      `お問い合わせ（${CATEGORY_LABEL[category]}）`,
      `<p>お名前: ${escapeHtml(name)}</p>
       <p>メール: ${escapeHtml(email)}</p>
       <p>区分: ${CATEGORY_LABEL[category]}</p>
       <hr/>
       <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>`,
    );
    const { sent } = await sendEmail({
      to: CATEGORY_TO[category],
      subject: `[Tsumiki] お問い合わせ（${CATEGORY_LABEL[category]}）`,
      html,
    });
    if (!sent) logger.info("contact message received (email disabled)", { category, email });
    return { ok: true, sent };
  } catch (err) {
    logger.error("contact submit error", err);
    return { ok: false, error: "送信に失敗しました。時間をおいて再度お試しください。" };
  }
}
