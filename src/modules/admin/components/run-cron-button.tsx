"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { runCronNow } from "../actions";

/**
 * 自動処理の手動実行。
 * 実行すると自動記帳・通知作成・古いデータの削除が走るため、
 * 確認を挟み、実行は監査ログに残す。
 */
export function RunCronButton() {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>();

  async function run() {
    const ok = await confirm({
      title: "自動処理をいま実行しますか？",
      body: "サブスクの自動記帳・通知の作成・古いデータの削除が実行されます。実行者は監査ログに残ります。",
      confirmText: "実行する",
    });
    if (!ok) return;
    setMsg(undefined);
    start(async () => {
      const res = await runCronNow({});
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      toast.success("自動処理を実行しました");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="gray" onClick={run} disabled={pending}>
        {pending ? "実行中…" : "いま実行する"}
      </Button>
      {msg && (
        <p role="alert" className="text-[13px] text-expense">
          {msg}
        </p>
      )}
    </div>
  );
}
