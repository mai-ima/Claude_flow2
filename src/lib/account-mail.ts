import "server-only";
import { sendEmail, emailLayout, escapeHtml } from "./email";
import { clientEnv } from "./env";
import { issueToken } from "./verification-token";

/**
 * アカウント関連のメール（パスワード再設定・メールアドレス確認）。
 *
 * リンクの組み立てとトークン発行をここに閉じ込める。画面側に散らすと、
 * 「トークンは発行したがメールは送っていない」といったずれが起きる。
 */

function link(path: string, token: string): string {
  const base = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

/** パスワード再設定メール。宛先が存在するかどうかは呼び出し側の責任。 */
export async function sendPasswordResetEmail(email: string) {
  const token = await issueToken("reset", email);
  const url = link("/reset-password", token);
  return sendEmail({
    to: email,
    subject: "【Tsumiki】パスワードの再設定",
    kind: "RESET",
    html: emailLayout(
      "パスワードの再設定",
      `<p>下のボタンから、新しいパスワードを設定してください。</p>
       <p style="margin:20px 0">
         <a href="${escapeHtml(url)}" style="display:inline-block;background:#0b6cf0;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">パスワードを再設定する</a>
       </p>
       <p style="font-size:13px;color:#8e8e93">このリンクは1時間で使えなくなります。<br>
       心当たりが無い場合は、このメールを破棄してください。パスワードは変わりません。</p>`,
    ),
  });
}

/** メールアドレス確認メール。 */
export async function sendEmailVerification(email: string) {
  const token = await issueToken("verify", email);
  const url = link("/verify-email", token);
  return sendEmail({
    to: email,
    subject: "【Tsumiki】メールアドレスの確認",
    kind: "VERIFY",
    html: emailLayout(
      "メールアドレスの確認",
      `<p>下のボタンを押すと、このメールアドレスの確認が完了します。</p>
       <p style="margin:20px 0">
         <a href="${escapeHtml(url)}" style="display:inline-block;background:#0b6cf0;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">メールアドレスを確認する</a>
       </p>
       <p style="font-size:13px;color:#8e8e93">このリンクは24時間で使えなくなります。</p>`,
    ),
  });
}

/**
 * 登録済みのアドレスで新規登録が試みられたときの通知。
 *
 * 登録フォームに「既に登録済みです」と表示すると、フォームを叩くだけで
 * 会員かどうかを調べられる。画面には成否を出さず、持ち主にだけ知らせる。
 * 心当たりがあれば次の行動（ログイン / パスワード再設定）に進めるようにする。
 */
export async function sendSignupAttemptNotice(email: string) {
  const base = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return sendEmail({
    to: email,
    subject: "【Tsumiki】このメールアドレスはすでに登録されています",
    kind: "VERIFY",
    html: emailLayout(
      "すでに登録されています",
      `<p>このメールアドレスで新規登録が試みられましたが、すでにアカウントが存在するため、新しくは作成されていません。</p>
       <p style="margin:20px 0">
         <a href="${escapeHtml(`${base}/login`)}" style="display:inline-block;background:#0b6cf0;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">ログインする</a>
       </p>
       <p>パスワードが分からない場合は、
         <a href="${escapeHtml(`${base}/forgot-password`)}">パスワードの再設定</a>
         からお手続きください。</p>
       <p style="font-size:13px;color:#8e8e93">お心当たりが無い場合は、このメールを破棄してください。アカウントに変更はありません。</p>`,
    ),
  });
}
