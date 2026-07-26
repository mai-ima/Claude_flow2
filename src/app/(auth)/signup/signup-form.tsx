"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signupAction, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function SignupForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/billing";
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signupAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {/* 「登録済みのメールです」等はフォーム全体の結果。
          パスワード欄の下に出すと原因を取り違えるため、先頭にまとめて出す。 */}
      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-expense/30 bg-expense/5 px-3.5 py-2.5 text-[13px] text-expense"
        >
          {state.error}
        </p>
      )}
      <Field label="お名前（任意）">
        <Input name="name" placeholder="やまだ たろう" autoComplete="name" />
      </Field>
      <Field label="メールアドレス">
        <Input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
        />
      </Field>
      <Field
        label="パスワード（8文字以上）"
        hint="安全のため、推測されにくいパスワードを設定してください。"
      >
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="8文字以上"
          autoComplete="new-password"
        />
      </Field>
      <Button type="submit" full size="lg" disabled={pending}>
        {pending ? "登録中…" : "アカウントを作成"}
      </Button>
      <p className="text-center text-[12px] leading-relaxed text-text-tertiary">
        登録すると、利用規約とプライバシーポリシーに同意したものとみなされます。
      </p>
      <p className="text-center text-[13px] text-text-secondary">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="font-medium text-accent">
          ログイン
        </Link>
      </p>
    </form>
  );
}
