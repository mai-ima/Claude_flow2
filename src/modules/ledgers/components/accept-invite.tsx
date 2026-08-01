"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "../actions";

/**
 * 招待を受ける操作。
 *
 * 受けられない理由は、押す前に画面で伝える。押してから断られるより、
 * 何をすればよいかが先に分かるほうがよい。
 */
export function AcceptInvite({
  token,
  invitedEmail,
  currentEmail,
  emailVerified,
}: {
  token: string;
  invitedEmail: string;
  currentEmail: string | null;
  emailVerified: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const mismatch = (currentEmail ?? "").trim().toLowerCase() !== invitedEmail;

  if (mismatch) {
    return (
      <div className="space-y-3 text-left">
        <p className="rounded-xl border border-expense/30 bg-expense/5 px-3.5 py-3 text-[13px] leading-relaxed text-expense">
          この招待は <b>{invitedEmail}</b> 宛です。
          いまログイン中のアカウント（{currentEmail ?? "不明"}）では受け取れません。
          招待されたメールアドレスでログインし直してください。
        </p>
        <Link href="/login" className="block">
          <Button full variant="tinted">
            別のアカウントでログイン
          </Button>
        </Link>
      </div>
    );
  }

  if (!emailVerified) {
    return (
      <div className="space-y-3 text-left">
        <p className="rounded-xl border border-border-subtle bg-surface-2 px-3.5 py-3 text-[13px] leading-relaxed text-text-secondary">
          参加するには、メールアドレスの確認が必要です。
          他人のアドレスで登録した人が招待を横取りできないようにするためです。
          設定画面から確認メールを送れます。
        </p>
        <Link href="/settings" className="block">
          <Button full variant="tinted">
            設定を開く
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        full
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await acceptInviteAction({ token });
            if (res.ok) router.push("/dashboard");
            else setError(res.error);
          })
        }
      >
        {pending ? "参加中…" : "参加する"}
      </Button>
      {error && (
        <p role="alert" className="text-[13px] text-expense">
          {error}
        </p>
      )}
    </div>
  );
}
