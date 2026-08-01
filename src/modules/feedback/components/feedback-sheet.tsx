"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { sendFeedback } from "../actions";
import { FEEDBACK_KIND_LABEL, type FeedbackKind } from "../schema";

/**
 * 要望・不具合を送る。
 *
 * 開いている画面のパスを一緒に送る。「どこで起きたか」が分からない報告は、
 * 直すのに何往復も要る。ただし入力した中身は送らない（金額やメモが
 * 意図せず届くことがないように、本文に書かれたものだけを送る）。
 */
export function FeedbackSheet({
  open,
  onClose,
  defaultEmail,
}: {
  open: boolean;
  onClose: () => void;
  /** 返信先の初期値。登録しているアドレスを入れておく。 */
  defaultEmail?: string | null;
}) {
  const pathname = usePathname();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<FeedbackKind>("BUG");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [wantReply, setWantReply] = useState(false);
  const [error, setError] = useState<string>();

  function submit() {
    setError(undefined);
    start(async () => {
      const res = await sendFeedback({
        kind,
        body,
        contactEmail: wantReply ? email : "",
        fromPath: pathname,
      });
      if (!res.ok) {
        setError(res.fieldErrors?.body?.[0] ?? res.fieldErrors?.contactEmail?.[0] ?? res.error);
        return;
      }
      toast.success("送信しました。ありがとうございます。");
      setBody("");
      setWantReply(false);
      onClose();
    });
  }

  const placeholder =
    kind === "BUG"
      ? "例: 予算の画面で金額を入れて保存を押しても、何も起きません。iPhone の Safari です。"
      : kind === "REQUEST"
        ? "例: 週ごとの支出も見られるようにしてほしいです。"
        : "お気づきのことをご自由にお書きください。";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="ご意見・不具合のご報告"
      footer={
        <Button full size="lg" onClick={submit} disabled={pending || body.trim().length < 5}>
          {pending ? "送信中…" : "送信する"}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] leading-relaxed text-text-secondary">
          お困りのことや、こうしてほしいという要望をお送りください。
          いただいた内容は開発の判断に使わせていただきます。
        </p>

        <Field label="種類">
          <Segmented<FeedbackKind>
            className="w-full"
            value={kind}
            onChange={setKind}
            options={(["BUG", "REQUEST", "OTHER"] as const).map((k) => ({
              value: k,
              label: FEEDBACK_KIND_LABEL[k],
            }))}
          />
        </Field>

        <Field
          label="内容"
          hint={
            kind === "BUG"
              ? "どの画面で、何をしたときに、どうなったかを書いていただけると助かります。"
              : undefined
          }
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder}
            rows={6}
          />
        </Field>

        <div className="rounded-xl bg-surface-2 px-3.5 py-3">
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={wantReply}
              onChange={(e) => setWantReply(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent-solid)]"
            />
            <span className="min-w-0 text-[13px] leading-relaxed">
              返信がほしい
              <span className="mt-0.5 block text-[12px] text-text-tertiary">
                内容によってはお返事できないことがあります。
              </span>
            </span>
          </label>
          {wantReply && (
            <div className="mt-2.5">
              <Input
                type="email"
                value={email}
                aria-label="返信先のメールアドレス"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="返信先のメールアドレス"
              />
            </div>
          )}
        </div>

        <p className="text-[11px] leading-relaxed text-text-tertiary">
          お送りいただく内容のほかに、いま開いている画面の場所と、端末の種類
          （「iPhone の Safari」程度）、アプリの版を一緒にお送りします。
          家計簿に入力された金額やメモが送られることはありません。
        </p>

        {error && (
          <p role="alert" className="text-[13px] text-expense">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
