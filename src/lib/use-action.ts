"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "./safe-action";

/**
 * Server Action の呼び出しを一箇所に集約する。
 *
 * 背景: 各所で `action(input)` の戻り値を捨てており、権限エラーやプラン上限に
 * 達したときに何も表示されず「ボタンを押しても無反応」に見えていた。
 * このフックを通せば、失敗は必ずトーストに出る。
 *
 * 使い方:
 *   const run = useAction();
 *   run(() => deleteGoal({ id }), { success: "削除しました" });
 */
export function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  function run<T>(
    fn: () => Promise<ActionResult<T>>,
    opts: {
      /** 成功時に出すトースト。省略時は無言で成功扱い。 */
      success?: string;
      /** 成功後に router.refresh() するか（既定: する）。 */
      refresh?: boolean;
      onSuccess?: (data: T) => void;
      /** エラーをトーストではなく自前で扱いたい場合。 */
      onError?: (message: string) => void;
    } = {},
  ) {
    const { success, refresh = true, onSuccess, onError } = opts;
    start(async () => {
      let res: ActionResult<T>;
      try {
        res = await fn();
      } catch {
        // ネットワーク断や Server Action 自体の失敗も握り潰さない。
        const m = "通信に失敗しました。時間をおいて再度お試しください。";
        if (onError) onError(m);
        else toast.error(m);
        return;
      }
      if (!res.ok) {
        if (onError) onError(res.error);
        else toast.error(res.error);
        return;
      }
      if (success) toast.success(success);
      onSuccess?.(res.data);
      if (refresh) router.refresh();
    });
  }

  return Object.assign(run, { pending });
}
