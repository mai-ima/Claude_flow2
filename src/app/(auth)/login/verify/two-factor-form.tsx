"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyTwoFactorAction, type AuthState } from "../../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function TwoFactorForm() {
  const next = useSearchParams().get("next") ?? "/billing";
  const [state, action, pending] = useActionState<AuthState, FormData>(
    verifyTwoFactorAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-expense/30 bg-expense/5 px-3.5 py-2.5 text-[13px] text-expense"
        >
          {state.error}
        </p>
      )}
      <Field label="6桁のコード" hint="認証アプリが使えないときは、復旧コードを入力してください。">
        <Input
          name="code"
          required
          autoFocus
          // 数字キーパッドを出しつつ、復旧コード（英数字）も入力できるようにする。
          inputMode="text"
          autoComplete="one-time-code"
          placeholder="123456"
          className="text-center tracking-[0.3em]"
        />
      </Field>
      <Button type="submit" full size="lg" disabled={pending}>
        {pending ? "確認中…" : "確認する"}
      </Button>
    </form>
  );
}
