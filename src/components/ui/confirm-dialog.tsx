"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Sheet } from "./sheet";
import { Button } from "./button";

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmText?: string;
  cancelText?: string;
  /** 破壊的操作（赤の確定ボタン）。 */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpts(options);
    });
  }, []);

  // アンマウント時に未解決の Promise が残ると、await している呼び出し元が
  // 永久に再開せず「押しても何も起きない」状態になる。false で解決して終わらせる。
  useEffect(() => {
    return () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    };
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={opts !== null}
        onClose={() => settle(false)}
        title={opts?.title ?? ""}
        footer={
          <div className="flex gap-2.5">
            <Button variant="gray" full size="lg" onClick={() => settle(false)}>
              {opts?.cancelText ?? "キャンセル"}
            </Button>
            <Button
              variant={opts?.danger ? "destructive" : "filled"}
              full
              size="lg"
              onClick={() => settle(true)}
            >
              {opts?.confirmText ?? "OK"}
            </Button>
          </div>
        }
      >
        {opts?.body ? (
          <p className="text-[15px] leading-relaxed text-text-secondary">{opts.body}</p>
        ) : (
          <div className="h-1" />
        )}
      </Sheet>
    </ConfirmContext.Provider>
  );
}
