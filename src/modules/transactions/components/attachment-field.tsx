"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { TrashIcon, PlusIcon } from "@/components/icons";

export interface AttachmentItem {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

const MAX_PER_TXN = 5;

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/**
 * レシートなどの添付。
 *
 * まだ保存していない記録には付けられない。付け先の記録が無いと、
 * 預けたファイルの行き場が決まらないため。新規のときは、保存した後に
 * もう一度開いて付けてもらう旨を書いておく。
 *
 * 中身は読まない（文字の読み取りはしない）。後から見返すためだけのもの。
 */
export function AttachmentField({
  transactionId,
  initial,
}: {
  /** 付け先。未保存の記録では undefined。 */
  transactionId?: string;
  initial: AttachmentItem[];
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<AttachmentItem[]>(initial);
  const [busy, setBusy] = useState(false);

  if (!transactionId) {
    return (
      <div>
        <span className="text-[13px] font-medium text-text-secondary">レシートなどの添付</span>
        <p className="mt-1 rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] leading-relaxed text-text-tertiary">
          先にこの記録を保存してください。保存したあと、もう一度開くとファイルを添付できます。
        </p>
      </div>
    );
  }

  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.set("transactionId", transactionId!);
      body.set("file", file);
      const res = await fetch("/api/attachments", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.message ?? "アップロードに失敗しました。");
        return;
      }
      setItems((s) => [...s, json as AttachmentItem]);
    } catch {
      toast.error("通信に失敗しました。電波の良いところでお試しください。");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/attachments?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.message ?? "削除に失敗しました。");
        return;
      }
      setItems((s) => s.filter((x) => x.id !== id));
    } catch {
      toast.error("通信に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="text-[13px] font-medium text-text-secondary">レシートなどの添付</span>

      {items.length > 0 && (
        <ul className="mt-1.5 space-y-1.5">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2"
            >
              {a.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-3 text-[10px] font-semibold text-text-tertiary">
                  PDF
                </span>
              )}
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1"
              >
                <span className="block truncate text-[13px] text-text-primary">{a.name}</span>
                <span className="block text-[11px] text-text-tertiary">{sizeLabel(a.size)}</span>
              </a>
              <button
                type="button"
                onClick={() => remove(a.id)}
                disabled={busy}
                aria-label={`${a.name} を削除`}
                className="tap-target grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
              >
                <TrashIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length < MAX_PER_TXN && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            className="sr-only"
            id={`attach-${transactionId}`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <label
            htmlFor={`attach-${transactionId}`}
            className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-border-strong px-3.5 text-[13px] font-medium text-accent"
          >
            <PlusIcon size={16} />
            {busy ? "送信中…" : "ファイルを選ぶ"}
          </label>
          <p className="mt-1 text-[11px] leading-relaxed text-text-tertiary">
            写真（JPEG・PNG・WebP・HEIC）と PDF、1つ5MBまで、1件につき{MAX_PER_TXN}個までです。
            中身の読み取りはしません。後から見返していただくためにお預かりするのみです。
          </p>
        </>
      )}
    </div>
  );
}
