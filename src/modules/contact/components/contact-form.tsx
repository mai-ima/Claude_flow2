"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { CheckIcon } from "@/components/icons";
import { CONTACT } from "@/lib/seo";
import { submitContactMessage } from "../actions";

type Category = "support" | "feedback" | "privacy";

const OPTIONS: { value: Category; label: string; to: string }[] = [
  { value: "support", label: "サポート（使い方・不具合）", to: CONTACT.support },
  { value: "feedback", label: "ご要望・ご意見", to: CONTACT.feedback },
  { value: "privacy", label: "プライバシー・データについて", to: CONTACT.privacy },
];

export function ContactForm({ emailEnabled }: { emailEnabled: boolean }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [v, setV] = useState({ category: "support" as Category, name: "", email: "", message: "" });

  function update<K extends keyof typeof v>(key: K, val: (typeof v)[K]) {
    setV((s) => ({ ...s, [key]: val }));
  }

  function mailtoFallback() {
    const to = OPTIONS.find((o) => o.value === v.category)?.to ?? CONTACT.support;
    const subject = encodeURIComponent(`[Tsumiki] お問い合わせ（${v.category}）`);
    const body = encodeURIComponent(`お名前: ${v.name}\nメール: ${v.email}\n\n${v.message}`);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }

  function submit() {
    setError(undefined);
    setFieldErrors({});

    // メール未設定の環境では、入力内容を引き継いでメールアプリを開く（常に機能する）。
    if (!emailEnabled) {
      if (!v.name.trim() || !v.email.trim() || v.message.trim().length < 10) {
        setError("お名前・メール・10文字以上のメッセージをご入力ください。");
        return;
      }
      mailtoFallback();
      return;
    }

    start(async () => {
      const res = await submitContactMessage(v);
      if (res.ok) {
        setSent(true);
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-surface-1 p-10 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-success/12 text-success">
          <CheckIcon size={28} />
        </div>
        <h2 className="text-[18px] font-bold tracking-tight">送信しました</h2>
        <p className="text-[14px] text-text-secondary">
          お問い合わせありがとうございます。内容を確認のうえ、必要に応じてご返信します。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <Field label="お問い合わせの種類">
        <Select
          value={v.category}
          onChange={(e) => update("category", e.target.value as Category)}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="お名前" error={fieldErrors.name?.[0]}>
        <Input value={v.name} onChange={(e) => update("name", e.target.value)} placeholder="山田 太郎" />
      </Field>
      <Field label="メールアドレス" error={fieldErrors.email?.[0]}>
        <Input
          type="email"
          inputMode="email"
          value={v.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="you@example.com"
        />
      </Field>
      <Field label="メッセージ" error={fieldErrors.message?.[0]}>
        <Textarea
          value={v.message}
          onChange={(e) => update("message", e.target.value)}
          placeholder="ご質問・ご要望・不具合の内容をご記入ください。"
          rows={5}
        />
      </Field>
      {error && <p className="text-[13px] text-expense">{error}</p>}
      <Button full size="lg" onClick={submit} disabled={pending}>
        {pending ? "送信中…" : emailEnabled ? "送信する" : "メールアプリで送信"}
      </Button>
      {!emailEnabled && (
        <p className="text-center text-[12px] text-text-tertiary">
          入力内容を引き継いで、お使いのメールアプリが開きます。
        </p>
      )}
    </div>
  );
}
