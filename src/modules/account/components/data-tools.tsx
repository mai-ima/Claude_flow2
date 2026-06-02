"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { DownloadIcon, ChevronRightIcon } from "@/components/icons";

export function DataTools({ isPro }: { isPro: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();

  if (!isPro) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-4">
        <DownloadIcon size={22} className="text-pod" />
        <span className="flex-1 text-[14px] text-text-secondary">
          CSV のインポート・エクスポートは PRO プランの機能です。
        </span>
        <ButtonLink href="/billing" size="sm" variant="tinted">
          アップグレード
        </ButtonLink>
      </div>
    );
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(undefined);
    try {
      const csv = await file.text();
      const res = await fetch("/api/import/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg(`${data.created}件を取り込みました${data.skipped ? `（${data.skipped}件スキップ）` : ""}。`);
        router.refresh();
      } else {
        setMsg(data.message ?? "取り込みに失敗しました。");
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <a
        href="/api/export/transactions"
        className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3 transition hover:opacity-80"
      >
        <DownloadIcon size={20} className="text-accent" />
        <span className="flex-1 text-[14px] font-medium">CSV でエクスポート</span>
        <ChevronRightIcon size={18} className="text-text-tertiary" />
      </a>

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="hidden"
        />
        <Button
          variant="gray"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? "取り込み中…" : "CSV をインポート"}
        </Button>
        <p className="mt-2 text-[12px] text-text-tertiary">
          エクスポートした CSV と同じ形式（日付・種別・金額・通貨・カテゴリ・支払い方法・メモ）に対応します。
        </p>
        {msg && <p className="mt-1 text-[13px] text-accent">{msg}</p>}
      </div>
    </div>
  );
}
