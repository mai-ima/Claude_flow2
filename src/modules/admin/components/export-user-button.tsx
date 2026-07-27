"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { exportUserData } from "../actions";

const REASONS = ["サポート対応", "開示請求", "不具合の調査", "本人からの依頼"];

/**
 * ユーザーデータの書き出し。
 * 個人情報を丸ごと取り出すため、理由の入力を求め、監査ログに残す。
 */
export function ExportUserButton({ userId, email }: { userId: string; email: string | null }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState(REASONS[0]);
  const [msg, setMsg] = useState<string>();

  function run() {
    setMsg(undefined);
    start(async () => {
      const res = await exportUserData({ userId, reason });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      // ブラウザ側でファイルにして渡す（サーバーに一時ファイルを作らない）。
      const blob = new Blob([res.data.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tsumiki-user-${email ?? userId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("書き出しました");
    });
  }

  return (
    <div className="space-y-2">
      <Field label="理由（監査ログに残ります）">
        <Select value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>
      <Button size="sm" variant="gray" onClick={run} disabled={pending}>
        {pending ? "書き出し中…" : "JSON で書き出す"}
      </Button>
      {msg && (
        <p role="alert" className="text-[13px] text-expense">
          {msg}
        </p>
      )}
    </div>
  );
}
