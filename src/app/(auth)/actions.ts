"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signInWithEmail, signOut } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません。"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください。"),
  name: z.string().optional(),
  next: z.string().optional(),
});

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    const f = z.flattenError(parsed.error).fieldErrors;
    return { error: f.password?.[0] ?? f.email?.[0] ?? "入力を確認してください。" };
  }
  try {
    await signInWithEmail(parsed.data.email, parsed.data.password, parsed.data.name);
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "INVALID_PASSWORD") {
      return { error: "パスワードが正しくありません。" };
    }
    if (code === "WEAK_PASSWORD") {
      return { error: "パスワードは8文字以上で入力してください。" };
    }
    console.error("[login]", err);
    return { error: "ログインに失敗しました。時間をおいて再度お試しください。" };
  }
  const next = parsed.data.next;
  redirect(next && next.startsWith("/") ? next : "/billing");
}

export async function logoutAction() {
  await signOut();
  redirect("/");
}
