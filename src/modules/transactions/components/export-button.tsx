"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { API_MESSAGE } from "@/lib/api-messages";

export function ExportButton({ enabled }: { enabled: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return (
      <Link href="/billing" className="mt-2 inline-block text-[14px] font-medium text-accent">
        PROで利用可能
      </Link>
    );
  }

  async function download() {
    setBusy(true);
    try {
      const res = await fetch("/api/export/transactions");
      if (!res.ok) {
        let message = "書き出しに失敗しました。時間をおいてお試しください。";
        if (res.status === 429) message = API_MESSAGE.RATE_LIMITED;
        else if (res.status === 403) message = "CSV エクスポートは PRO プランの機能です。";
        else if (res.status === 401) message = API_MESSAGE.UNAUTHORIZED;
        toast.error(message);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tsumiki-transactions.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("通信に失敗しました。接続を確認してください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={download}
      disabled={busy}
      className="mt-2 inline-block text-[14px] font-medium text-accent disabled:opacity-50"
    >
      {busy ? "書き出し中…" : "ダウンロード"}
    </button>
  );
}
