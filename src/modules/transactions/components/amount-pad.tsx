"use client";

import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

/** 四則演算つき式を整数評価（×÷ を先に処理）。安全のため数字と演算子のみ。 */
export function evalExpr(expr: string): number {
  const tokens = expr.match(/\d+|[+\-*/]/g);
  if (!tokens || tokens.length === 0) return 0;
  // pass 1: * /
  const mid: (number | string)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "*" || t === "/") {
      const prev = Number(mid.pop() ?? 0);
      const next = Number(tokens[++i] ?? 0);
      mid.push(t === "*" ? prev * next : next === 0 ? prev : prev / next);
    } else {
      mid.push(/^\d+$/.test(t) ? Number(t) : t);
    }
  }
  // pass 2: + -
  let acc = Number(mid[0] ?? 0);
  for (let i = 1; i < mid.length; i += 2) {
    const op = mid[i];
    const n = Number(mid[i + 1] ?? 0);
    if (op === "+") acc += n;
    else if (op === "-") acc -= n;
  }
  return Math.max(0, Math.round(acc));
}

const QUICK = [500, 1000, 3000, 5000, 10000];
const OPS: Record<string, string> = { "÷": "/", "×": "*", "−": "-", "+": "+" };

export function AmountPad({
  initial,
  type,
  currency = "JPY",
  onChange,
}: {
  initial: number;
  type: "EXPENSE" | "INCOME";
  currency?: string;
  onChange: (amount: number) => void;
}) {
  const [expr, setExpr] = useState(initial ? String(initial) : "");
  const value = evalExpr(expr);
  const hasOp = /[+\-*/]/.test(expr);

  function update(next: string) {
    setExpr(next);
    onChange(evalExpr(next));
    haptic(8);
  }

  function pressDigit(d: string) {
    update((expr === "0" ? "" : expr) + d);
  }
  function pressOp(sym: string) {
    if (!expr) return;
    const op = OPS[sym];
    // 末尾が演算子なら置換
    update(/[+\-*/]$/.test(expr) ? expr.slice(0, -1) + op : expr + op);
  }
  function backspace() {
    update(expr.slice(0, -1));
  }
  function clearAll() {
    update("");
  }
  function setQuick(n: number) {
    update(String(n));
  }

  const keys: { label: string; onClick: () => void; kind?: "op" | "util" }[] = [
    { label: "7", onClick: () => pressDigit("7") },
    { label: "8", onClick: () => pressDigit("8") },
    { label: "9", onClick: () => pressDigit("9") },
    { label: "÷", onClick: () => pressOp("÷"), kind: "op" },
    { label: "4", onClick: () => pressDigit("4") },
    { label: "5", onClick: () => pressDigit("5") },
    { label: "6", onClick: () => pressDigit("6") },
    { label: "×", onClick: () => pressOp("×"), kind: "op" },
    { label: "1", onClick: () => pressDigit("1") },
    { label: "2", onClick: () => pressDigit("2") },
    { label: "3", onClick: () => pressDigit("3") },
    { label: "−", onClick: () => pressOp("−"), kind: "op" },
    { label: "0", onClick: () => pressDigit("0") },
    { label: "00", onClick: () => pressDigit("00") },
    { label: "⌫", onClick: backspace, kind: "util" },
    { label: "+", onClick: () => pressOp("+"), kind: "op" },
  ];

  return (
    <div className="space-y-3">
      {/* 表示 */}
      <div className="rounded-2xl bg-surface-2 px-5 py-5 text-center">
        <div className="min-h-[44px] text-[40px] font-bold leading-none tracking-tight tabular-nums">
          {expr ? formatMoney(value, currency) : <span className="text-text-tertiary">¥0</span>}
        </div>
        <div className="mt-1 h-4 text-[13px] text-text-tertiary tabular-nums">
          {hasOp ? expr.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−") : type === "EXPENSE" ? "支出" : "収入"}
        </div>
      </div>

      {/* クイック金額 */}
      <div className="flex flex-wrap gap-2">
        {QUICK.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setQuick(n)}
            aria-label={`${formatMoney(n, currency)} を加算`}
            className="rounded-full bg-surface-2 px-3.5 py-1.5 text-[13px] font-medium text-text-secondary transition duration-[var(--dur-1)] ease-spring active:scale-95 hover:bg-surface-3"
          >
            {formatMoney(n, currency)}
          </button>
        ))}
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto rounded-full px-3.5 py-1.5 text-[13px] font-medium text-text-tertiary transition duration-[var(--dur-1)] ease-spring active:scale-95 hover:text-expense"
        >
          クリア
        </button>
      </div>

      {/* キーパッド */}
      <div role="group" aria-label="電卓キーパッド" className="grid grid-cols-4 gap-2">
        {keys.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={k.onClick}
            aria-label={k.label === "⌫" ? "1文字削除" : k.label}
            className={cn(
              "grid h-12 place-items-center rounded-xl text-[20px] font-semibold transition duration-[var(--dur-1)] ease-spring active:scale-95",
              k.kind === "op"
                ? "bg-accent/10 text-accent hover:bg-accent/15"
                : k.kind === "util"
                  ? "bg-surface-2 text-text-secondary hover:bg-surface-3"
                  : "bg-surface-1 text-text-primary hover:bg-surface-2 border border-border-subtle",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}
