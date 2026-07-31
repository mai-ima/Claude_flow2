"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { sendVerificationEmailAction } from "../actions";

export function EmailVerification({
  email,
  verified,
  emailEnabled,
}: {
  email: string | null;
  verified: boolean;
  emailEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  function send() {
    setSent(false);
    setError(undefined);
    start(async () => {
      const res = await sendVerificationEmailAction({});
      if (res.ok) {
        setSent(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] text-text-secondary">メールアドレス</span>
        <span className="text-[14px] font-medium break-all">{email}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
        <span className="text-[14px] text-text-secondary">確認状況</span>
        {verified ? (
          <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[12px] font-medium text-success">
            確認済み
          </span>
        ) : (
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] text-text-secondary">
            未確認
          </span>
        )}
      </div>

      {!verified && (
        <>
          <p className="text-[13px] leading-relaxed text-text-tertiary">
            {emailEnabled
              ? "確認しておくと、パスワードを忘れたときにご自身で再設定できます。"
              : "ただいまメールの送信を準備中のため、確認メールをお送りできません。"}
          </p>
          {emailEnabled && (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="tinted" size="sm" onClick={send} disabled={pending}>
                {pending ? "送信中…" : "確認メールを送る"}
              </Button>
              {sent && <span className="text-[13px] text-success">送信しました</span>}
              {error && (
                <span role="alert" className="text-[13px] text-expense">
                  {error}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
