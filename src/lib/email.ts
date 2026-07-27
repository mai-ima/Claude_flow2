import "server-only";
import { env, isEmailEnabled } from "./env";
import { logger } from "./logger";
import { recordEmail, type EmailKind } from "./ops-log";

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  /** 送信ログの分類。管理画面での絞り込みと再送に使う。 */
  kind?: EmailKind;
}

/**
 * Resend REST でメール送信（env 差込み式）。
 * RESEND_API_KEY が無ければ送信せずログのみ（no-op）。
 */
export async function sendEmail({
  to,
  subject,
  html,
  kind = "REMINDER",
}: EmailInput): Promise<{ sent: boolean }> {
  if (!isEmailEnabled) {
    logger.info("email skipped (no RESEND_API_KEY)", { to, subject });
    await recordEmail({ to, subject, kind, status: "SKIPPED", error: "RESEND_API_KEY 未設定" });
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
      const detail = `Resend ${res.status}`;
      logger.error("email send failed", new Error(detail), { to, subject });
      await recordEmail({ to, subject, kind, status: "FAILED", error: detail });
      return { sent: false };
    }
    await recordEmail({ to, subject, kind, status: "SENT" });
    return { sent: true };
  } catch (err) {
    logger.error("email send error", err, { to, subject });
    await recordEmail({
      to,
      subject,
      kind,
      status: "FAILED",
      error: err instanceof Error ? err.message : String(err),
    });
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

/**
 * HTML メール本文に埋め込む値のエスケープ。
 * サブスク名など利用者が入力した文字列をそのまま差し込むと、
 * メール本文の HTML が壊れる／意図しないマークアップが入る。
 */
export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
