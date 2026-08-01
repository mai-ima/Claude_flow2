"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FeedbackSheet } from "./feedback-sheet";

/**
 * 設定に置く送信の入口。
 *
 * 常時どこかに浮かせるボタンにはしない。家計簿は毎日開くものなので、
 * 使わない人には邪魔にしかならない。困ったときに探す場所（設定）に置く。
 */
export function FeedbackEntry({ defaultEmail }: { defaultEmail?: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-text-secondary">
        うまく動かないところや、こうしてほしいという要望をお送りいただけます。
        いただいた内容は開発の判断に使わせていただきます。
      </p>
      <Button variant="tinted" size="sm" onClick={() => setOpen(true)}>
        ご意見・不具合を送る
      </Button>
      <FeedbackSheet open={open} onClose={() => setOpen(false)} defaultEmail={defaultEmail} />
    </div>
  );
}
