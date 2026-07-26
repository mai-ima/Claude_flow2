"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * このセグメント用のエラー画面。
 * 用意しないと global-error.tsx（html ごと差し替え・固定ライト配色）に落ち、
 * ヘッダーもテーマも失われた別サイトのような見た目になる。
 */
export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center">
      <h1 className="text-[20px] font-bold tracking-tight">問題が発生しました</h1>
      <p className="mt-2 text-[14px] text-text-secondary">
        一時的なエラーの可能性があります。もう一度お試しください。
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>再読み込み</Button>
        <Button variant="gray" onClick={() => (window.location.href = "/")}>
          トップへ
        </Button>
      </div>
    </div>
  );
}
