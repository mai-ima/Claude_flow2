"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type State = (AuthState & { done?: boolean }) | undefined;

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    requestPasswordResetAction,
    undefined,
  );

  if (state?.done) {
    // 登録の有無を問わず同じ文面。ここで差をつけると、
    // フォームを叩くだけで会員かどうかを調べられてしまう。
    return (
      <p
        role="status"
        className="rounded-xl border border-border-subtle bg-surface-2 px-3.5 py-3 text-[14px] leading-relaxed text-text-secondary"
      >
        ご登録があれば、再設定のご案内をお送りしました。メールをご確認ください。
        <br />
        <span className="text-[13px] text-text-tertiary">
          届かない場合は、迷惑メールフォルダもご確認ください。リンクは1時間で使えなくなります。
        </span>
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
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
      <Button type="submit" full size="lg" disabled={pending}>
        {pending ? "送信中…" : "再設定のご案内を送る"}
      </Button>
    </form>
  );
}
