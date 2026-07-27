"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { deleteAccountAction } from "../actions";

const CONFIRM_WORD = "削除";

export function DangerZone() {
  const [confirming, setConfirming] = useState(false);
  const [word, setWord] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  function close() {
    setConfirming(false);
    setWord("");
    setError(undefined);
  }

  function remove() {
    setError(undefined);
    start(async () => {
      const res = await deleteAccountAction({});
      if (res.ok) {
        // セッションは削除済み。完全リロードで状態を破棄してトップへ。
        window.location.assign("/");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div>
      {!confirming ? (
        <Button variant="ghost" className="text-expense" onClick={() => setConfirming(true)}>
          アカウントを削除
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border border-expense/30 bg-expense/5 p-4">
          <p className="text-[14px] text-text-secondary">
            アカウントとすべてのデータ（帳簿・取引・サブスク・予算）が完全に削除されます。この操作は取り消せません。
          </p>
          <p className="text-[13px] text-text-tertiary">
            共有帳簿でオーナーになっている場合は退会できません。先にオーナーを譲るか、帳簿を削除してください。
          </p>
          <div>
            <p className="mb-1.5 text-[13px] text-text-secondary">
              確認のため <b className="text-text-primary">{CONFIRM_WORD}</b> と入力してください。
            </p>
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              aria-label={`アカウント削除の確認: ${CONFIRM_WORD}と入力`}
              placeholder={CONFIRM_WORD}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={remove}
              disabled={pending || word.trim() !== CONFIRM_WORD}
            >
              {pending ? "削除中…" : "完全に削除する"}
            </Button>
            <Button variant="ghost" size="sm" onClick={close} disabled={pending}>
              キャンセル
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-expense">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
