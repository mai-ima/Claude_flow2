"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { deleteAllDataAction } from "../actions";

const CONFIRM_WORD = "削除";

export function DeleteAllData() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirm("");
    setError(undefined);
  }

  function run() {
    setError(undefined);
    start(async () => {
      const res = await deleteAllDataAction({});
      if (res.ok) {
        setOpen(false);
        setConfirm("");
        setDone(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[14px] font-medium">すべての記録を削除</div>
        <div className="text-[12px] text-text-tertiary">
          取引・サブスク・予算・目標・支払い方法を削除し、カテゴリを初期状態に戻します。
        </div>
        {done && <div className="mt-1 text-[12px] text-success">削除しました。</div>}
      </div>
      <Button
        variant="gray"
        size="sm"
        className="shrink-0 text-expense"
        onClick={() => {
          setDone(false);
          setOpen(true);
        }}
      >
        削除
      </Button>

      <Sheet
        open={open}
        onClose={close}
        title="すべての記録を削除しますか？"
        footer={
          <Button
            full
            size="lg"
            variant="destructive"
            disabled={confirm.trim() !== CONFIRM_WORD || pending}
            onClick={run}
          >
            {pending ? "削除中…" : "完全に削除する"}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-expense/30 bg-expense/5 p-4 text-[13px] leading-relaxed text-text-secondary">
            この帳簿のすべての取引・サブスク・予算・貯金目標・支払い方法が削除され、カテゴリは初期状態に戻ります。
            <b className="text-expense">この操作は取り消せません。</b>
            なお、アカウント自体は削除されません。
          </div>
          <div>
            <p className="mb-1.5 text-[13px] text-text-secondary">
              確認のため <b className="text-text-primary">{CONFIRM_WORD}</b> と入力してください。
            </p>
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={CONFIRM_WORD}
              aria-label="全データ削除の確認: 削除と入力"
              autoFocus
            />
          </div>
          {error && <p className="text-[13px] text-expense">{error}</p>}
        </div>
      </Sheet>
    </div>
  );
}
