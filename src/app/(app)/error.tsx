"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BellIcon } from "@/components/icons";

export default function AppError({
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
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-text-tertiary">
        <BellIcon size={28} />
      </div>
      <h1 className="mt-5 text-[20px] font-bold tracking-tight">問題が発生しました</h1>
      <p className="mt-2 text-[14px] text-text-secondary">
        一時的なエラーの可能性があります。もう一度お試しください。
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>再読み込み</Button>
        <Button variant="gray" onClick={() => (window.location.href = "/dashboard")}>
          ホームへ
        </Button>
      </div>
    </div>
  );
}
