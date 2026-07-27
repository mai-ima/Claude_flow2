"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { sendBroadcast } from "../content-actions";

/**
 * お知らせ配信。
 * 送信先が広いので、送る前に対象人数を見せてから確認を取る。
 */
export function BroadcastForm({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [audience, setAudience] = useState<"ALL" | "FREE" | "PLUS" | "PRO">("ALL");
  const [msg, setMsg] = useState<string>();

  const target = counts[audience] ?? 0;

  async function send() {
    setMsg(undefined);
    const ok = await confirm({
      title: `${target}人にお知らせを送りますか？`,
      body: "取り消せません。送信は監査ログに残ります。",
      confirmText: "送信する",
    });
    if (!ok) return;
    start(async () => {
      const res = await sendBroadcast({ title, body, href, audience });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      toast.success(`${res.data.sent}人に送信しました`);
      setTitle("");
      setBody("");
      setHref("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface-1 p-4">
      <Field label="件名">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
      </Field>
      <Field label="本文">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={500} />
      </Field>
      <Field label="リンク先（任意）" hint="例: /changelog">
        <Input value={href} onChange={(e) => setHref(e.target.value)} placeholder="/" />
      </Field>
      <Field label="送信先">
        <Select
          value={audience}
          onChange={(e) => setAudience(e.target.value as typeof audience)}
        >
          <option value="ALL">全員（{counts.ALL ?? 0}人）</option>
          <option value="FREE">フリーのみ（{counts.FREE ?? 0}人）</option>
          <option value="PLUS">プラスのみ（{counts.PLUS ?? 0}人）</option>
          <option value="PRO">プロのみ（{counts.PRO ?? 0}人）</option>
        </Select>
      </Field>
      <p className="text-[13px] text-text-secondary">
        いま選ばれている送信先は <b>{target}人</b> です。凍結中のユーザーには送りません。
      </p>
      <Button onClick={send} disabled={pending || !title || !body}>
        {pending ? "送信中…" : "送信する"}
      </Button>
      {msg && (
        <p role="alert" className="text-[13px] text-expense">
          {msg}
        </p>
      )}
    </div>
  );
}
