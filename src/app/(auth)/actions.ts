"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signInWithEmail, signOut } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません。"),
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
    name: formData.get("name") || undefined,
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: z.flattenError(parsed.error).fieldErrors.email?.[0] ?? "入力を確認してください。" };
  }
  try {
    await signInWithEmail(parsed.data.email, parsed.data.name);
  } catch (err) {
    console.error("[login]", err);
    return { error: "ログインに失敗しました。時間をおいて再度お試しください。" };
  }
  const next = parsed.data.next;
  redirect(next && next.startsWith("/") ? next : "/dashboard");
}

export async function logoutAction() {
  await signOut();
  redirect("/");
}
