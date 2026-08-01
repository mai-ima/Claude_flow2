"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  signInWithEmail,
  signOut,
  loginAsDemo,
  resetPassword,
  completeTwoFactorLogin,
} from "@/lib/auth";
import { checkSecondFactor } from "@/lib/two-factor";
import {
  startTwoFactorChallenge,
  pendingTwoFactorUserId,
  finishTwoFactorChallenge,
} from "@/lib/two-factor-challenge";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/verification-token";
import {
  sendPasswordResetEmail,
  sendEmailVerification,
  sendSignupAttemptNotice,
} from "@/lib/account-mail";
import { isEmailEnabled } from "@/lib/env";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-next";
import { logger } from "@/lib/logger";

const baseSchema = {
  email: z.string().email("メールアドレスの形式が正しくありません。"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください。"),
  next: z.string().optional(),
};

const loginSchema = z.object(baseSchema);
const signupSchema = z.object({ ...baseSchema, name: z.string().optional() });

export type AuthState = { error?: string } | undefined;
// 後方互換
export type LoginState = AuthState;


export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    const f = z.flattenError(parsed.error).fieldErrors;
    return { error: f.password?.[0] ?? f.email?.[0] ?? "入力を確認してください。" };
  }
  // IP だけで数えると、複数のIPから1つのアカウントを狙う総当たりを止められない。
  // 逆にメールだけで数えると、共有回線からの正常な利用を巻き込む。両方で数える。
  const email = parsed.data.email.trim().toLowerCase();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login:${await clientIp()}`, 12, 60, { memoryFallback: true }),
    rateLimit(`login-email:${email}`, 8, 300, { memoryFallback: true }),
  ]);
  if (!byIp.ok || !byEmail.ok) {
    return { error: "試行回数が多すぎます。少し時間をおいてお試しください。" };
  }
  let pending = false;
  try {
    const result = await signInWithEmail(parsed.data.email, parsed.data.password, {
      mode: "login",
    });
    if (result.pendingTwoFactor) {
      await startTwoFactorChallenge(result.user.id);
      pending = true;
    }
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    // 「アカウントが無い」「パスワードが違う」を区別して返すと、
    // メールアドレスを入れ替えて試すだけで会員かどうかを外から調べられる。
    // 原因はサーバーのログに残し、画面には同じ文言を返す。
    if (code === "NO_ACCOUNT" || code === "INVALID_PASSWORD" || code === "PASSWORD_NOT_SET") {
      logger.warn("login rejected", { code });
      return {
        error:
          "メールアドレスまたはパスワードが正しくありません。初めての方は新規登録をお試しください。",
      };
    }
    if (code === "WEAK_PASSWORD") {
      return { error: "パスワードは8文字以上で入力してください。" };
    }
    if (code === "SCHEMA_DRIFT" || code === "DATABASE_UNAVAILABLE") {
      return {
        error:
          "サーバー側の準備が完了していません。時間をおいて再度お試しください。（管理者の方は /api/health をご確認ください）",
      };
    }
    if (code === "ACCOUNT_SUSPENDED") {
      return {
        error:
          "このアカウントは現在ご利用いただけません。お心当たりがない場合はお問い合わせください。",
      };
    }
    logger.error("login failed", err);
    return { error: "ログインに失敗しました。時間をおいて再度お試しください。" };
  }
  // redirect は例外で制御を移すため、try の外で呼ぶ。
  if (pending) {
    redirect(`/login/verify?next=${encodeURIComponent(safeNext(parsed.data.next))}`);
  }
  redirect(safeNext(parsed.data.next));
}

/**
 * 二段目の照合。
 *
 * 途中の状態は httpOnly Cookie のトークンで持つ。ここに userId を直接
 * 入れると、書き換えるだけで他人としてログインできてしまう。
 */
export async function verifyTwoFactorAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = z
    .object({
      code: z.string().min(1, "コードを入力してください。"),
      next: z.string().optional(),
    })
    .safeParse({ code: formData.get("code"), next: formData.get("next") || undefined });
  if (!parsed.success) {
    return { error: z.flattenError(parsed.error).fieldErrors.code?.[0] };
  }

  const rl = await rateLimit(`twofa:${await clientIp()}`, 10, 300, { memoryFallback: true });
  if (!rl.ok) {
    return { error: "試行回数が多すぎます。少し時間をおいてお試しください。" };
  }

  try {
    const userId = await pendingTwoFactorUserId();
    if (!userId) {
      return { error: "確認の有効期限が切れました。もう一度ログインしてください。" };
    }
    const result = await checkSecondFactor(userId, parsed.data.code);
    if (!result.ok) {
      return { error: "コードが正しくありません。" };
    }
    await finishTwoFactorChallenge();
    await completeTwoFactorLogin(userId);
  } catch (err) {
    logger.error("two-factor verification failed", err);
    return { error: "確認に失敗しました。時間をおいて再度お試しください。" };
  }
  redirect(safeNext(parsed.data.next));
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    const f = z.flattenError(parsed.error).fieldErrors;
    return { error: f.password?.[0] ?? f.email?.[0] ?? "入力を確認してください。" };
  }
  const rl = await rateLimit(`signup:${await clientIp()}`, 8, 60, { memoryFallback: true });
  if (!rl.ok) {
    return { error: "試行回数が多すぎます。少し時間をおいてお試しください。" };
  }
  // メールを送れる環境では、登録の成否を画面に出さない。
  // 成功時だけ即ログインすると、着地点の違いで「登録済みかどうか」が分かる。
  // 送れない環境では確認メールが届かず何も進まないので、従来通り即ログインする。
  const confirmByEmail = isEmailEnabled;
  let takenNotice = false;

  try {
    await signInWithEmail(parsed.data.email, parsed.data.password, {
      mode: "signup",
      name: parsed.data.name,
      autoLogin: !confirmByEmail,
    });
    // 確認メールは「送れたら送る」。送信基盤が無い/落ちている環境で
    // 登録そのものを失敗させると、使い始められなくなる。
    void sendEmailVerification(parsed.data.email).catch((err) =>
      logger.error("verification email failed", err),
    );
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "EMAIL_TAKEN") {
      // 「登録済みです」と返すと、登録フォームを叩くだけで会員かどうかを
      // 調べられる。持ち主にだけメールで知らせ、画面には成否を出さない。
      // 送信が使えない環境では知らせようがないので、そのときだけ従来通り伝える
      // （黙って何も起きないほうが、利用者にとっては困る）。
      if (confirmByEmail) {
        void sendSignupAttemptNotice(parsed.data.email).catch((e) =>
          logger.error("signup notice failed", e),
        );
        // 新規登録が成功したときと同じ画面へ。ここで分岐が見えると意味が無い。
        takenNotice = true;
      } else {
        return { error: "このメールアドレスは登録済みです。ログインしてください。" };
      }
    }
    if (code === "WEAK_PASSWORD") {
      return { error: "パスワードは8文字以上で入力してください。" };
    }
    if (code === "SCHEMA_DRIFT" || code === "DATABASE_UNAVAILABLE") {
      return {
        error:
          "サーバー側の準備が完了していません。時間をおいて再度お試しください。（管理者の方は /api/health をご確認ください）",
      };
    }
    if (!takenNotice) {
      logger.error("signup failed", err);
      return { error: "登録に失敗しました。時間をおいて再度お試しください。" };
    }
  }
  // redirect は例外で制御を移すため try の外で呼ぶ。
  if (confirmByEmail) redirect("/signup/sent");
  redirect(safeNext(parsed.data.next));
}

/**
 * パスワード再設定の申し込み。
 *
 * 返す文言は結果によらず同じにする。「そのアドレスは登録されていません」と
 * 返すと、フォームを叩くだけで会員かどうかを調べられてしまう。
 * 送ったかどうかは本人だけがメールで分かる。
 */
export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState & { done?: boolean }> {
  const parsed = z
    .object({ email: z.string().email("メールアドレスの形式が正しくありません。") })
    .safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: z.flattenError(parsed.error).fieldErrors.email?.[0] };
  }
  const email = parsed.data.email.trim().toLowerCase();

  // 送信の踏み台にされないよう、宛先とIPの両方で数える。
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`reset-req:${await clientIp()}`, 5, 600, { memoryFallback: true }),
    rateLimit(`reset-req-email:${email}`, 3, 600, { memoryFallback: true }),
  ]);
  if (!byIp.ok || !byEmail.ok) {
    // ここも成否を漏らさない。断っていることだけ伝える。
    return { error: "お申し込みが続いています。しばらく時間をおいてお試しください。" };
  }

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (user) await sendPasswordResetEmail(email);
    else logger.info("password reset requested for unknown address");
  } catch (err) {
    logger.error("password reset request failed", err);
    // 失敗したことも隠す。利用者にできることは同じ（届かなければ再度試す）。
  }
  return { done: true };
}

/** 再設定リンクからの新しいパスワード設定。 */
export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState & { done?: boolean }> {
  const parsed = z
    .object({
      token: z.string().min(1),
      password: z.string().min(8, "パスワードは8文字以上で入力してください。"),
      confirm: z.string().min(1, "確認のため、もう一度入力してください。"),
    })
    .refine((v) => v.password === v.confirm, {
      path: ["confirm"],
      message: "パスワードが一致しません。",
    })
    .safeParse({
      token: formData.get("token"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });
  if (!parsed.success) {
    const f = z.flattenError(parsed.error).fieldErrors;
    return { error: f.confirm?.[0] ?? f.password?.[0] ?? "入力を確認してください。" };
  }

  const rl = await rateLimit(`reset-submit:${await clientIp()}`, 10, 600, { memoryFallback: true });
  if (!rl.ok) {
    return { error: "試行回数が多すぎます。少し時間をおいてお試しください。" };
  }

  try {
    const email = await consumeToken("reset", parsed.data.token);
    if (!email) {
      return {
        error:
          "このリンクは使えません。期限が切れているか、すでに使用済みです。お手数ですが、もう一度お申し込みください。",
      };
    }
    await resetPassword(email, parsed.data.password);
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "WEAK_PASSWORD") {
      return { error: "パスワードは8文字以上で入力してください。" };
    }
    if (code === "SCHEMA_DRIFT" || code === "DATABASE_UNAVAILABLE") {
      return { error: "サーバー側の準備が完了していません。時間をおいて再度お試しください。" };
    }
    logger.error("password reset failed", err);
    return { error: "パスワードの再設定に失敗しました。時間をおいて再度お試しください。" };
  }
  return { done: true };
}

export async function demoLoginAction() {
  try {
    await loginAsDemo();
  } catch (err) {
    logger.error("demo login failed", err);
    redirect("/login?error=demo");
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  await signOut();
  redirect("/");
}
