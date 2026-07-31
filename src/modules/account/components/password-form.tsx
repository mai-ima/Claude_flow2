"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { changePasswordAction } from "../actions";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function PasswordForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [v, setV] = useState(EMPTY);

  function save() {
    setDone(false);
    setError(undefined);
    setFieldErrors({});
    start(async () => {
      const res = await changePasswordAction(v);
      if (res.ok) {
        setDone(true);
        setV(EMPTY);
        router.refresh();
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });
  }

  return (
    <div className="space-y-4">
      <Field label="現在のパスワード" error={fieldErrors.currentPassword?.[0]}>
        <Input
          type="password"
          autoComplete="current-password"
          value={v.currentPassword}
          onChange={(e) => setV((s) => ({ ...s, currentPassword: e.target.value }))}
        />
      </Field>
      <Field
        label="新しいパスワード"
        hint="8文字以上。他のサービスと同じものは避けてください。"
        error={fieldErrors.newPassword?.[0]}
      >
        <Input
          type="password"
          autoComplete="new-password"
          value={v.newPassword}
          onChange={(e) => setV((s) => ({ ...s, newPassword: e.target.value }))}
        />
      </Field>
      <Field label="新しいパスワード（確認）" error={fieldErrors.confirmPassword?.[0]}>
        <Input
          type="password"
          autoComplete="new-password"
          value={v.confirmPassword}
          onChange={(e) => setV((s) => ({ ...s, confirmPassword: e.target.value }))}
        />
      </Field>
      <p className="text-[13px] text-text-tertiary">
        変更すると、いま使っているこの端末以外のログインはすべて終了します。
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? "変更中…" : "パスワードを変更"}
        </Button>
        {done && <span className="text-[13px] text-success">変更しました</span>}
        {error && (
          <span role="alert" className="text-[13px] text-expense">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
