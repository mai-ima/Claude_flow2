"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteAccountAction } from "../actions";

export function DangerZone() {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

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
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={remove} disabled={pending}>
              {pending ? "削除中…" : "完全に削除する"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
              キャンセル
            </Button>
          </div>
          {error && <p className="text-[13px] text-expense">{error}</p>}
        </div>
      )}
    </div>
  );
}
