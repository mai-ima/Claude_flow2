"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FeedbackSheet } from "./feedback-sheet";

/**
 * 設定に置く送信の入口。
 *
 * 常時どこかに浮かせるボタンにはしない。家計簿は毎日開くものなので、
 * 使わない人には邪魔にしかならない。困ったときに探す場所（設定）に置く。
 */
export function FeedbackEntry({
  defaultEmail,
  sentCount = 0,
  repliedCount = 0,
}: {
  defaultEmail?: string | null;
  /** 送った件数。0 のときは履歴への導線を出さない。 */
  sentCount?: number;
  /** 返信が付いている件数。 */
  repliedCount?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-text-secondary">
        うまく動作しない点や、追加を希望される機能などをお送りいただけます。
        いただいた内容は今後の開発の参考にさせていただきます。
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="tinted" size="sm" onClick={() => setOpen(true)}>
          ご意見・不具合を送る
        </Button>
        {sentCount > 0 && (
          <Link
            href="/settings/feedback"
            className="tap-target inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-accent hover:bg-accent/8"
          >
            送ったご報告（{sentCount}）
            {repliedCount > 0 && (
              <span className="rounded-full bg-accent-solid px-1.5 py-0.5 text-[11px] font-semibold text-white">
                返信 {repliedCount}
              </span>
            )}
          </Link>
        )}
      </div>
      <FeedbackSheet open={open} onClose={() => setOpen(false)} defaultEmail={defaultEmail} />
    </div>
  );
}
