"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  beginTwoFactorAction,
  confirmTwoFactorAction,
  disableTwoFactorAction,
  regenerateRecoveryCodesAction,
} from "../actions";

/** 復旧コードは再表示できないので、写し取れる形で一度だけ出す。 */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-[14px] leading-relaxed text-text-secondary">
        復旧コードです。認証アプリが使えなくなったとき、これでログインできます。
        <strong className="font-semibold text-text-primary">
          この画面を閉じると二度と表示できません。
        </strong>
        印刷するか、パスワード管理アプリなど安全な場所に保管してください。
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-xl border border-border-subtle bg-surface-2 p-3.5">
        {codes.map((c) => (
          <li key={c} className="text-center font-mono text-[14px] tracking-wide">
            {c}
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-text-tertiary">1つのコードは一度しか使えません。</p>
      <Button onClick={onDone}>保管しました</Button>
    </div>
  );
}

export function TwoFactorSettings({
  enabled,
  remainingRecoveryCodes,
}: {
  enabled: boolean;
  remainingRecoveryCodes: number;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [setup, setSetup] = useState<{ secret: string; uri: string }>();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<string[]>();

  function begin() {
    setError(undefined);
    start(async () => {
      const res = await beginTwoFactorAction({});
      if (res.ok) setSetup(res.data);
      else setError(res.error);
    });
  }

  function confirmCode() {
    setError(undefined);
    start(async () => {
      const res = await confirmTwoFactorAction({ code });
      if (res.ok) {
        setCodes(res.data.recoveryCodes);
        setSetup(undefined);
        setCode("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  async function disable() {
    // confirm は start() の外で待つ。中で待つと transition が保留のままになる。
    const ok = await confirm({
      title: "二要素認証を解除しますか",
      body: "解除すると、パスワードだけでログインできる状態に戻ります。",
      confirmText: "解除する",
      danger: true,
    });
    if (!ok) return;
    setError(undefined);
    start(async () => {
      const res = await disableTwoFactorAction({ password });
      if (res.ok) {
        setPassword("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function regenerate() {
    setError(undefined);
    start(async () => {
      const res = await regenerateRecoveryCodesAction({ password });
      if (res.ok) {
        setCodes(res.data.recoveryCodes);
        setPassword("");
      } else {
        setError(res.error);
      }
    });
  }

  const errorNode = error ? (
    <p role="alert" className="text-[13px] text-expense">
      {error}
    </p>
  ) : null;

  if (codes) {
    return <RecoveryCodes codes={codes} onDone={() => setCodes(undefined)} />;
  }

  // 設定の途中（鍵を発行し、認証アプリへの登録待ち）
  if (setup) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] leading-relaxed text-text-secondary">
          認証アプリ（Google Authenticator、1Password など）に次の鍵を登録してください。
        </p>
        <div className="rounded-xl border border-border-subtle bg-surface-2 p-3.5">
          <div className="text-[12px] text-text-tertiary">セットアップキー</div>
          <div className="mt-1 font-mono text-[15px] tracking-wider break-all">
            {setup.secret}
          </div>
        </div>
        <details className="text-[13px] text-text-tertiary">
          <summary className="cursor-pointer">アプリのリンクを使う</summary>
          <p className="mt-2 break-all font-mono text-[12px]">{setup.uri}</p>
        </details>
        <Field label="アプリに表示された6桁のコード">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
          />
        </Field>
        {errorNode}
        <div className="flex flex-wrap gap-3">
          <Button onClick={confirmCode} disabled={pending}>
            {pending ? "確認中…" : "有効にする"}
          </Button>
          <Button variant="gray" onClick={() => setSetup(undefined)} disabled={pending}>
            キャンセル
          </Button>
        </div>
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[14px] text-text-secondary">状態</span>
          <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[12px] font-medium text-success">
            有効
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-text-tertiary">
          ログイン時に、パスワードに加えて認証アプリのコードが必要になります。
          残りの復旧コード: {remainingRecoveryCodes}個
          {remainingRecoveryCodes <= 2 && "（少なくなっています。作り直しをおすすめします）"}
        </p>
        <Field label="パスワード" hint="解除・復旧コードの作り直しには、本人確認としてパスワードが必要です。">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        {errorNode}
        <div className="flex flex-wrap gap-3">
          <Button variant="tinted" onClick={regenerate} disabled={pending || !password}>
            復旧コードを作り直す
          </Button>
          <Button variant="destructive" onClick={disable} disabled={pending || !password}>
            解除する
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[14px] leading-relaxed text-text-secondary">
        ログイン時に、パスワードに加えて認証アプリの6桁コードを求めます。
        パスワードが他人に知られても、それだけでは入れなくなります。
      </p>
      {errorNode}
      <Button onClick={begin} disabled={pending}>
        {pending ? "準備中…" : "二要素認証を設定する"}
      </Button>
    </div>
  );
}
