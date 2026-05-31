"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/billing";
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="お名前（新規登録時のみ・任意）">
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
        error={state?.error}
        hint="初めてのメールアドレスなら、この内容で新規登録されます。"
      >
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="8文字以上"
          autoComplete="current-password"
        />
      </Field>
      <Button type="submit" full size="lg" disabled={pending}>
        {pending ? "サインイン中…" : "ログイン / 新規登録"}
      </Button>
      <p className="text-center text-[12px] leading-relaxed text-text-tertiary">
        続行すると、利用規約とプライバシーポリシーに同意したものとみなされます。
      </p>
    </form>
  );
}
