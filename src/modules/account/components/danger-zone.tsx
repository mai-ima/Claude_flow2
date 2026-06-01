"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteAccountAction } from "../actions";

export function DangerZone() {
  const [confirming, setConfirming] = useState(false);

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
            <form action={deleteAccountAction}>
              <Button type="submit" variant="destructive" size="sm">
                完全に削除する
              </Button>
            </form>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
