"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signInWithEmail, signOut, loginAsDemo } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-next";

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
  const rl = await rateLimit(`login:${await clientIp()}`, 12, 60);
  if (!rl.ok) {
    return { error: "試行回数が多すぎます。少し時間をおいてお試しください。" };
  }
  try {
    await signInWithEmail(parsed.data.email, parsed.data.password, { mode: "login" });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "NO_ACCOUNT") {
      return { error: "アカウントが見つかりません。新規登録をお試しください。" };
    }
    if (code === "INVALID_PASSWORD") {
      return { error: "パスワードが正しくありません。" };
    }
    if (code === "PASSWORD_NOT_SET") {
      return {
        error:
          "このアカウントにはパスワードが設定されていません。お問い合わせから再設定をご依頼ください。",
      };
    }
    if (code === "WEAK_PASSWORD") {
      return { error: "パスワードは8文字以上で入力してください。" };
    }
    if (code === "ACCOUNT_SUSPENDED") {
      return {
        error:
          "このアカウントは現在ご利用いただけません。お心当たりがない場合はお問い合わせください。",
      };
    }
    console.error("[login]", err);
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
    console.error("[signup]", err);
    return { error: "登録に失敗しました。時間をおいて再度お試しください。" };
  }
  redirect(safeNext(parsed.data.next));
}

export async function demoLoginAction() {
  try {
    await loginAsDemo();
  } catch (err) {
    console.error("[demo-login]", err);
    redirect("/login?error=demo");
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  await signOut();
  redirect("/");
}
