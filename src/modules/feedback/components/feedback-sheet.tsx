"use client";

import { useState, useTransition, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { sendFeedback } from "../actions";
import { FEEDBACK_KIND_LABEL, type FeedbackKind } from "../schema";

/** 下書きの置き場。書きかけで画面を閉じても消えないようにする。 */
const DRAFT_KEY = "tsumiki:feedback-draft";
const MAX = 2000;

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
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<FeedbackKind>("BUG");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [wantReply, setWantReply] = useState(false);
  const [error, setError] = useState<string>();
  const [restored, setRestored] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // 書きかけを復元する。不具合の報告は、状況を確かめに別の画面へ
  // 行きたくなることが多い。そこで消えると、二度と書いてもらえない。
  //
  // 復元は effect ではなく描画中に行う。effect にすると、いったん空欄の
  // シートが見えてから中身が入る（ちらつく）。React が公式に勧めている
  // 「props が変わったときに state を合わせる」書き方。
  // open は必ず false から始まり、押されて初めて true になるので、
  // サーバー側の描画と食い違うことはない。
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && !restored) {
      setRestored(true);
      try {
        const raw = window.localStorage.getItem(DRAFT_KEY);
        const d = raw ? (JSON.parse(raw) as { kind?: string; body?: string }) : null;
        if (d && typeof d.body === "string" && d.body.length > 0) setBody(d.body);
        if (d?.kind === "BUG" || d?.kind === "REQUEST" || d?.kind === "OTHER") setKind(d.kind);
      } catch {
        // 壊れた下書きは無かったことにする。ここで止める理由がない。
      }
    }
  }

  // 保存。空になったら消してよい ── 復元が済んだあとにしか動かないため、
  // 「復元前に空で上書きして下書きを失う」順序にはならない（restored で守る）。
  useEffect(() => {
    if (!open || !restored) return;
    try {
      if (body.trim().length === 0) window.localStorage.removeItem(DRAFT_KEY);
      else window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ kind, body }));
    } catch {
      // 保存できない設定（プライベートブラウズ等）でも送信は妨げない。
    }
  }, [open, restored, kind, body]);

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
      toast.success("送信いたしました。ご協力ありがとうございます。");
      setBody("");
      setWantReply(false);
      onClose();
      // 送ったものが「送ったご報告」にすぐ出るようにする。
      router.refresh();
    });
  }

  const placeholder =
    kind === "BUG"
      ? "例: 予算の画面で金額を入れて保存を押しても、何も起きません。iPhone の Safari です。"
      : kind === "REQUEST"
        ? "例: 週ごとの支出も見られるようにしてほしいです。"
        : "お気づきの点をご自由にご記入ください。";

  const tooShort = body.trim().length < 5;
  const tooLong = body.length > MAX;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="ご意見・不具合のご報告"
      footer={
        <Button full size="lg" onClick={submit} disabled={pending || tooShort || tooLong}>
          {pending ? "送信中…" : "送信する"}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] leading-relaxed text-text-secondary">
          ご不便な点や、追加を希望される機能などをお送りください。
          いただいた内容は今後の開発の参考にさせていただきます。
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
              ? "どの画面で、何をしたときに、どうなったかをご記入いただけますと幸いです。"
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

        <div className="-mt-2 flex items-center justify-between text-[11px] text-text-tertiary">
          <span>入力中の内容は自動的に保存されます。</span>
          <span className={tooLong ? "text-expense" : "tabular-nums"}>
            {body.length} / {MAX}
          </span>
        </div>

        {kind === "BUG" && (
          <button
            type="button"
            onClick={() =>
              setBody((prev) =>
                prev.trim().length > 0
                  ? prev
                  : "どの画面で:\n何をしたら:\nどうなった:\nこうなると思っていた:\n",
              )
            }
            className="tap-target text-[12px] text-accent underline underline-offset-2"
          >
            記入例を挿入する
          </button>
        )}

        <div className="rounded-xl bg-surface-2 px-3.5 py-3">
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={wantReply}
              onChange={(e) => setWantReply(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent-solid)]"
            />
            <span className="min-w-0 text-[13px] leading-relaxed">
              返信を希望する
              <span className="mt-0.5 block text-[12px] text-text-tertiary">
                内容によってはお返事いたしかねる場合がございます。
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
          お返事は「設定 → データとその他 → 送ったご報告」でもご覧いただけます。
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
