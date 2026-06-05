/**
 * 金額入力の簡易数式評価（ベータ機能）。
 * `+ - * /` と括弧、小数のみを許可。eval/Function は使わず、
 * トークナイズ + 操車場アルゴリズムで安全に評価する。
 * 結果は最小単位の整数に丸める。評価不能なら null。
 */
export function evalAmount(input: string): number | null {
  const src = input.replace(/[¥,\s　]/g, "").replace(/×/g, "*").replace(/÷/g, "/");
  if (src === "") return null;
  // 許可文字のみ（数字・小数点・演算子・括弧）。
  if (!/^[0-9.+\-*/()]+$/.test(src)) return null;

  const tokens = tokenize(src);
  if (!tokens) return null;
  const rpn = toRpn(tokens);
  if (!rpn) return null;
  const value = evalRpn(rpn);
  if (value === null || !Number.isFinite(value)) return null;
  return Math.round(value);
}

type Token = { t: "num"; v: number } | { t: "op"; v: "+" | "-" | "*" | "/" } | { t: "("; } | { t: ")" };

function tokenize(src: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c >= "0" && c <= "9") {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const num = Number(src.slice(i, j));
      if (Number.isNaN(num)) return null;
      tokens.push({ t: "num", v: num });
      i = j;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      // 単項マイナス/プラス: 先頭または演算子/開き括弧の直後は 0 を補う。
      const prev = tokens[tokens.length - 1];
      const unary = !prev || prev.t === "op" || prev.t === "(";
      if (unary && (c === "-" || c === "+")) tokens.push({ t: "num", v: 0 });
      tokens.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") { tokens.push({ t: "(" }); i++; continue; }
    if (c === ")") { tokens.push({ t: ")" }); i++; continue; }
    return null;
  }
  return tokens;
}

const PREC: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

function toRpn(tokens: Token[]): Token[] | null {
  const out: Token[] = [];
  const ops: Token[] = [];
  for (const tk of tokens) {
    if (tk.t === "num") out.push(tk);
    else if (tk.t === "op") {
      while (
        ops.length &&
        ops[ops.length - 1].t === "op" &&
        PREC[(ops[ops.length - 1] as { v: string }).v] >= PREC[tk.v]
      ) {
        out.push(ops.pop()!);
      }
      ops.push(tk);
    } else if (tk.t === "(") ops.push(tk);
    else if (tk.t === ")") {
      let found = false;
      while (ops.length) {
        const top = ops.pop()!;
        if (top.t === "(") { found = true; break; }
        out.push(top);
      }
      if (!found) return null; // 括弧の対応が崩れている
    }
  }
  while (ops.length) {
    const top = ops.pop()!;
    if (top.t === "(" || top.t === ")") return null;
    out.push(top);
  }
  return out;
}

function evalRpn(rpn: Token[]): number | null {
  const stack: number[] = [];
  for (const tk of rpn) {
    if (tk.t === "num") stack.push(tk.v);
    else if (tk.t === "op") {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) return null;
      switch (tk.v) {
        case "+": stack.push(a + b); break;
        case "-": stack.push(a - b); break;
        case "*": stack.push(a * b); break;
        case "/": if (b === 0) return null; stack.push(a / b); break;
      }
    }
  }
  return stack.length === 1 ? stack[0] : null;
}
