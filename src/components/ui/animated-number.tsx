"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/money";

/**
 * 値が変化したとき、前の値から新しい値へ ease-out でカウントアップする。
 *
 * 初期値は target をそのまま返す。0 から始めると SSR の HTML が
 * すべて「¥0」になり、ハイドレーション直後まで金額が読めない
 * （数字が一斉に飛ぶようにも見える）。
 * prefers-reduced-motion では即値。setState は rAF 内のみ。
 */
export function useCountUp(target: number, duration = 650): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const currentRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const dur = reduce ? 0 : duration;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = dur <= 0 ? 1 : Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (target - from) * eased);
      currentRef.current = v;
      setVal(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // 途中で中断された場合、次回は「今表示している値」から続ける。
      // target を入れてしまうと、次の変化で数値が飛ぶ。
      fromRef.current = currentRef.current;
    };
  }, [target, duration]);

  return val;
}

/** 金額/数値をなめらかに変化させて表示。currency 指定で通貨整形。 */
export function AnimatedNumber({
  value,
  currency,
  className,
}: {
  value: number;
  currency?: string;
  className?: string;
}) {
  const v = useCountUp(value);
  return (
    <span className={className}>
      {currency ? formatMoney(v, currency) : v.toLocaleString("ja-JP")}
    </span>
  );
}
