"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { upsertBanner, deleteBanner } from "../content-actions";
import { TrashIcon } from "@/components/icons";

interface Banner {
  id: string;
  message: string;
  href: string | null;
  tone: "INFO" | "WARNING" | "CRITICAL";
  startsAt: string;
  endsAt: string;
}

const TONE_LABEL = { INFO: "お知らせ", WARNING: "注意", CRITICAL: "重要" } as const;

export function BannerManager({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [tone, setTone] = useState<Banner["tone"]>("INFO");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [msg, setMsg] = useState<string>();

  function save() {
    setMsg(undefined);
    start(async () => {
      const res = await upsertBanner({ message, href, tone, startsAt, endsAt });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      toast.success("バナーを登録しました");
      setMessage("");
      setHref("");
      setStartsAt("");
      setEndsAt("");
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await deleteBanner({ id });
      if (!res.ok) setMsg(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {banners.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
          {banners.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-2 border-t border-border-subtle px-4 py-2.5 text-[13px] first:border-t-0"
            >
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px]">
                {TONE_LABEL[b.tone]}
              </span>
              <span className="min-w-0 flex-1 truncate">{b.message}</span>
              <span className="text-text-tertiary">
                {b.startsAt.replace("T", " ")} 〜 {b.endsAt.replace("T", " ")}
              </span>
              <button
                onClick={() => remove(b.id)}
                aria-label="バナーを削除"
                className="grid h-8 w-8 place-items-center rounded-lg text-text-tertiary hover:bg-expense/10 hover:text-expense"
              >
                <TrashIcon size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface-1 p-4">
        <Field label="文面">
          <Input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="種類">
            <Select value={tone} onChange={(e) => setTone(e.target.value as Banner["tone"])}>
              <option value="INFO">お知らせ</option>
              <option value="WARNING">注意</option>
              <option value="CRITICAL">重要</option>
            </Select>
          </Field>
          <Field label="リンク先（任意）">
            <Input value={href} onChange={(e) => setHref(e.target.value)} placeholder="/" />
          </Field>
          <Field label="開始">
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </Field>
          <Field label="終了">
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </Field>
        </div>
        <Button size="sm" onClick={save} disabled={pending || !message || !startsAt || !endsAt}>
          {pending ? "保存中…" : "バナーを追加"}
        </Button>
        {msg && (
          <p role="alert" className="text-[13px] text-expense">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
