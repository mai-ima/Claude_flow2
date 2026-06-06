"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface AppChrome {
  /** 現在ページの大型タイトル文字列（ヘッダー昇格表示に使用）。 */
  title: string;
  /** 大型タイトルがスクロールでヘッダー下へ隠れたか。 */
  promoted: boolean;
  setTitle: (t: string) => void;
  setPromoted: (v: boolean) => void;
}

const Ctx = createContext<AppChrome | null>(null);

export function AppChromeProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState("");
  const [promoted, setPromoted] = useState(false);
  const value = useMemo(
    () => ({ title, promoted, setTitle, setPromoted }),
    [title, promoted],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Provider 外でも安全に使えるよう no-op フォールバックを返す。 */
export function useAppChrome(): AppChrome {
  return (
    useContext(Ctx) ?? {
      title: "",
      promoted: false,
      setTitle: () => {},
      setPromoted: () => {},
    }
  );
}
