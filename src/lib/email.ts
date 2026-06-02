import "server-only";
import { env, isEmailEnabled } from "./env";
import { logger } from "./logger";

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Resend REST でメール送信（env 差込み式）。
 * RESEND_API_KEY が無ければ送信せずログのみ（no-op）。
 */
export async function sendEmail({ to, subject, html }: EmailInput): Promise<{ sent: boolean }> {
  if (!isEmailEnabled) {
    logger.info("email skipped (no RESEND_API_KEY)", { to, subject });
    return { sent: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM ?? "Tsumiki <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      logger.error("email send failed", new Error(`Resend ${res.status}`), { to, subject });
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    logger.error("email send error", err, { to, subject });
    return { sent: false };
  }
}

/** シンプルな和文 HTML メールテンプレート。 */
export function emailLayout(title: string, body: string): string {
  return `<div style="font-family:-apple-system,'Hiragino Sans','Noto Sans JP',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1d1d1f">
  <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
  <div style="font-size:15px;line-height:1.7;color:#3a3a3c">${body}</div>
  <p style="margin-top:24px;font-size:12px;color:#8e8e93">Tsumiki — 家計とサブスクを、ひとつに。</p>
</div>`;
}
