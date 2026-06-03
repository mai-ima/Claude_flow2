"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/money";

/**
 * 値が変化したとき、前の値から新しい値へ ease-out でカウントアップ。
 * prefers-reduced-motion では即値。setState は rAF 内のみ（同期 setState を避ける）。
 */
export function useCountUp(target: number, duration = 650): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);

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
      setVal(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
