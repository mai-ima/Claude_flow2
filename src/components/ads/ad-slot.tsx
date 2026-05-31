"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { SparklesIcon, ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * 控えめな広告枠。
 * - PLUS/PRO は何も表示しない
 * - AdSense キーがある FREE ユーザーにのみ広告を遅延読み込み（自動広告は使わず固定枠のみ）
 * - キーが無い場合は、レイアウトを保ったまま「自社プランのアップグレード訴求」を表示（世界観維持＋CLS=0）
 * すべて App Store「Today」風の角丸カードでラップし、"Sponsored" ラベルを付す。
 */
export function AdSlot({
  tier,
  adsenseClient,
  slot,
  className,
}: {
  tier: string;
  adsenseClient?: string;
  slot?: string;
  className?: string;
}) {
  const ref = useRef<HTMLModElement>(null);
  const showRealAd = tier === "FREE" && Boolean(adsenseClient);

  useEffect(() => {
    if (!showRealAd) return;
    if (!document.getElementById("adsbygoogle-js")) {
      const s = document.createElement("script");
      s.id = "adsbygoogle-js";
      s.async = true;
      s.crossOrigin = "anonymous";
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`;
      document.head.appendChild(s);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* no-op */
    }
  }, [showRealAd, adsenseClient]);

  if (tier !== "FREE") return null;

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border-subtle bg-surface-1", className)}>
      <div className="flex items-center justify-between px-4 pt-2.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
          Sponsored
        </span>
      </div>
      <div className="min-h-[160px] px-4 pb-4 pt-1">
        {showRealAd ? (
          <ins
            ref={ref}
            className="adsbygoogle block"
            style={{ display: "block", minHeight: 160 }}
            data-ad-client={adsenseClient}
            data-ad-slot={slot}
            data-ad-format="fluid"
            data-full-width-responsive="true"
          />
        ) : (
          <Link
            href="/pricing"
            className="flex h-full min-h-[140px] items-center gap-4 rounded-xl bg-gradient-to-br from-accent/8 to-pod/8 px-5 py-4 transition hover:from-accent/12 hover:to-pod/12"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-white">
              <SparklesIcon size={26} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold tracking-tight">
                広告のない、もっと静かな体験へ。
              </span>
              <span className="block text-[13px] text-text-secondary">
                プラスにアップグレードすると、広告が消えてサブスク管理が無制限に。
              </span>
            </span>
            <ChevronRightIcon size={20} className="shrink-0 text-text-tertiary" />
          </Link>
        )}
      </div>
    </div>
  );
}
