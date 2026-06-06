"use client";

import { useEffect, useRef } from "react";
import { useAppChrome } from "./app-chrome";

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
      <div className="mb-6 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] sm:text-[34px]">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-[15px] text-text-secondary">{subtitle}</p>}
        </div>
        {action}
      </div>
    </>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:max-w-5xl">{children}</div>;
}
