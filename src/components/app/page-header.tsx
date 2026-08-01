"use client";

import { useEffect, useRef } from "react";
import { useAppChrome } from "./app-chrome";
import { cn } from "@/lib/cn";

/**
 * iOS 風の大型タイトル。スクロールで上のセンチネルがヘッダー下へ隠れると
 * `promoted` を立て、AppHeader 側にタイトルを昇格表示させる。
 * API（title/subtitle/action）は従来どおり。各ページは現状のまま自動適用。
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { setTitle, setPromoted } = useAppChrome();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(title);
    return () => {
      setTitle("");
      setPromoted(false);
    };
  }, [title, setTitle, setPromoted]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setPromoted(!entry.isIntersecting),
      // ヘッダー高（約 56px + safe-area）ぶん上に判定線を寄せる。
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [setPromoted]);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      {/* 狭い画面では操作部を次の行へ折り返す（タイトルの不自然な改行を防ぐ）。 */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-3 gap-y-3">
        <div className="min-w-0">
          <h1 className="truncate text-[30px] font-bold leading-tight tracking-[-0.02em] sm:text-[34px]">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-[15px] text-text-secondary">{subtitle}</p>}
        </div>
        {action}
      </div>
    </>
  );
}

/**
 * ページの外枠。
 *
 * 幅は中身の並びで決める。
 * - list: 縦に1列だけ並ぶ画面（家計簿・目標・設定など）。
 *   広い画面でいっぱいまで伸ばすと、日付と金額が左右の端に離れ、
 *   1行読むのに目が往復する。読みやすい幅で止める。
 * - wide: 横に並べる意味がある画面（ホーム・分析）。
 *   カードやグラフを並べられるので、広さがそのまま情報量になる。
 */
export function PageContainer({
  children,
  width = "wide",
}: {
  children: React.ReactNode;
  width?: "list" | "wide";
}) {
  return (
    <div
      className={cn(
        "mx-auto px-4 py-6 sm:px-6",
        width === "list" ? "max-w-3xl" : "max-w-3xl lg:max-w-5xl",
      )}
    >
      {children}
    </div>
  );
}
