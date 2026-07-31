"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/billing";
  const [state, action, pending] = useActionState<AuthState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {/* 「アカウントが見つかりません」等はフォーム全体の結果。
          パスワード欄の下に出すと原因を取り違えるため、先頭にまとめて出す。 */}
      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-expense/30 bg-expense/5 px-3.5 py-2.5 text-[13px] text-expense"
        >
          {state.error}
        </p>
      )}
      <Field label="メールアドレス">
        <Input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
        />
      </Field>
      <Field label="パスワード">
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="パスワード"
          autoComplete="current-password"
        />
      </Field>
      <Button type="submit" full size="lg" disabled={pending}>
        {pending ? "サインイン中…" : "ログイン"}
      </Button>
      <p className="text-center text-[13px]">
        <Link href="/forgot-password" className="text-text-secondary hover:text-text-primary">
          パスワードをお忘れですか
        </Link>
      </p>
      <p className="text-center text-[13px] text-text-secondary">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="font-medium text-accent">
          新規登録
        </Link>
      </p>
    </form>
  );
}
