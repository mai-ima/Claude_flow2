"use client";

import { useEffect } from "react";

/**
 * サービスワーカーの登録。
 *
 * 目的は「圏外で開いたときに真っ白にならない」ことだけ。
 * 家計簿の中身はキャッシュしない（古い金額を見せないため）ので、
 * これが動かない環境でも失うものはない。だから失敗しても黙って諦める。
 *
 * 開発中は登録しない。作りかけの画面が保存されて、直したのに
 * 古いものが出続ける、という混乱のもとになる。
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // 画面の表示を邪魔しないよう、読み込みが落ち着いてから登録する。
    const id = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 登録できなくても機能は変わらない。利用者に伝えることは無い。
      });
    }, 2000);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
