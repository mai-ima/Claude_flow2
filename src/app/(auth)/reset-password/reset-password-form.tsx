"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type State = (AuthState & { done?: boolean }) | undefined;

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, action, pending] = useActionState<State, FormData>(
    resetPasswordAction,
    undefined,
  );

  if (!token) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-expense/30 bg-expense/5 px-3.5 py-3 text-[13px] leading-relaxed text-expense"
      >
        再設定用のリンクが正しくありません。メール内のリンクをもう一度お開きください。
      </p>
    );
  }

  if (state?.done) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="rounded-xl border border-border-subtle bg-surface-2 px-3.5 py-3 text-[14px] leading-relaxed text-text-secondary"
        >
          パスワードを変更しました。安全のため、これまでのログインはすべて終了しています。
          新しいパスワードでログインしてください。
        </p>
        <Link href="/login" className="block">
          <Button full size="lg">
            ログインする
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-expense/30 bg-expense/5 px-3.5 py-2.5 text-[13px] text-expense"
        >
          {state.error}
        </p>
      )}
      <Field label="新しいパスワード（8文字以上）">
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>
      <Field label="新しいパスワード（確認）">
        <Input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Button type="submit" full size="lg" disabled={pending}>
        {pending ? "設定中…" : "パスワードを設定する"}
      </Button>
    </form>
  );
}
