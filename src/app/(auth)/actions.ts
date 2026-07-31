"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signInWithEmail, signOut, loginAsDemo } from "@/lib/auth";
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
    rateLimit(`login:${await clientIp()}`, 12, 60),
    rateLimit(`login-email:${email}`, 8, 300),
  ]);
  if (!byIp.ok || !byEmail.ok) {
    return { error: "試行回数が多すぎます。少し時間をおいてお試しください。" };
  }
  try {
    await signInWithEmail(parsed.data.email, parsed.data.password, { mode: "login" });
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
  const rl = await rateLimit(`signup:${await clientIp()}`, 8, 60);
  if (!rl.ok) {
    return { error: "試行回数が多すぎます。少し時間をおいてお試しください。" };
  }
  try {
    await signInWithEmail(parsed.data.email, parsed.data.password, {
      mode: "signup",
      name: parsed.data.name,
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "EMAIL_TAKEN") {
      return { error: "このメールアドレスは登録済みです。ログインしてください。" };
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
    logger.error("signup failed", err);
    return { error: "登録に失敗しました。時間をおいて再度お試しください。" };
  }
  redirect(safeNext(parsed.data.next));
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
