"use client";

import { useState } from "react";
import Link from "next/link";
import { XIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

const TONE_CLASS = {
  INFO: "bg-accent-solid text-white",
  WARNING: "bg-warning text-white",
  CRITICAL: "bg-expense-solid text-white",
} as const;

export interface BannerData {
  id: string;
  message: string;
  href: string | null;
  tone: keyof typeof TONE_CLASS;
}

/**
 * 運営からの告知。利用者が閉じられる。
 * 閉じたことは localStorage に持つ（サーバーに持つほどのものではない）。
 */
export function AnnouncementBanner({ banner }: { banner: BannerData }) {
  const [closed, setClosed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(`tsumiki-banner-${banner.id}`) === "closed";
    } catch {
      return false;
    }
  });

  if (closed) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[13px]",
        TONE_CLASS[banner.tone],
      )}
      role="status"
    >
      <span className="min-w-0 flex-1">{banner.message}</span>
      {banner.href && (
        <Link href={banner.href} className="shrink-0 font-medium underline">
          詳しく見る
        </Link>
      )}
      <button
        onClick={() => {
          setClosed(true);
          try {
            localStorage.setItem(`tsumiki-banner-${banner.id}`, "closed");
          } catch {
            // 保存できなくても閉じる動作自体は成立させる。
          }
        }}
        aria-label="お知らせを閉じる"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/20"
      >
        <XIcon size={15} />
      </button>
    </div>
  );
}
