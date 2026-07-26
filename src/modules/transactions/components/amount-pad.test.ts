import { describe, it, expect } from "vitest";
import { evalExpr } from "./amount-pad";

describe("evalExpr", () => {
  it("単一の数値", () => {
    expect(evalExpr("1200")).toBe(1200);
  });
  it("加算", () => {
    expect(evalExpr("1200+800")).toBe(2000);
  });
  it("減算", () => {
    expect(evalExpr("5000-1200")).toBe(3800);
  });
  it("乗算を加算より先に処理", () => {
    expect(evalExpr("1000+2*3")).toBe(1006);
  });
  it("割り勘（除算）", () => {
    expect(evalExpr("3000/2")).toBe(1500);
  });
  it("除算は四捨五入", () => {
    expect(evalExpr("1000/3")).toBe(333);
  });
  // 旧実装は 0除算で左辺(1000)を返していたが、予算欄の数式入力(evalAmount)は
  // 不正な式として扱う。両者で結果が食い違っていたため、無効=0 に統一した。
  it("0除算は無効な式として0", () => {
    expect(evalExpr("1000/0")).toBe(0);
  });
  it("括弧が使える（予算欄の数式入力と同じ挙動）", () => {
    expect(evalExpr("(1000+500)*2")).toBe(3000);
  });
  it("末尾の演算子は無視", () => {
    expect(evalExpr("1200+")).toBe(1200);
  });
  it("空文字は0", () => {
    expect(evalExpr("")).toBe(0);
  });
  it("負の結果は0でクランプ", () => {
    expect(evalExpr("100-500")).toBe(0);
  });
});
