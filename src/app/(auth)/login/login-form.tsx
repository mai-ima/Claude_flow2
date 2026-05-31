"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="お名前（任意）">
        <Input name="name" placeholder="やまだ たろう" autoComplete="name" />
      </Field>
      <Field label="メールアドレス" error={state?.error}>
        <Input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
        />
      </Field>
      <Button type="submit" full size="lg" disabled={pending}>
        {pending ? "サインイン中…" : "メールで続ける"}
      </Button>
      <p className="text-center text-[12px] leading-relaxed text-text-tertiary">
        続行すると、利用規約とプライバシーポリシーに同意したものとみなされます。
      </p>
    </form>
  );
}
