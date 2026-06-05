import { describe, it, expect } from "vitest";
import { evalAmount } from "./calc";

describe("evalAmount", () => {
  it("単純な数値", () => {
    expect(evalAmount("1200")).toBe(1200);
    expect(evalAmount("0")).toBe(0);
  });

  it("四則演算", () => {
    expect(evalAmount("1200+300")).toBe(1500);
    expect(evalAmount("1000-250")).toBe(750);
    expect(evalAmount("1480*12")).toBe(17760);
    expect(evalAmount("1000/4")).toBe(250);
  });

  it("優先順位と括弧", () => {
    expect(evalAmount("1000+200*3")).toBe(1600);
    expect(evalAmount("(1000+200)*3")).toBe(3600);
  });

  it("記号ゆれ（×÷・カンマ・¥・空白）を許容", () => {
    expect(evalAmount("1,200 + 300")).toBe(1500);
    expect(evalAmount("¥980×2")).toBe(1960);
    expect(evalAmount("1000　÷　4")).toBe(250);
  });

  it("小数は丸める", () => {
    expect(evalAmount("1000/3")).toBe(333);
    expect(evalAmount("100.5+0.5")).toBe(101);
  });

  it("単項マイナス", () => {
    expect(evalAmount("-500+800")).toBe(300);
  });

  it("不正な入力は null", () => {
    expect(evalAmount("")).toBeNull();
    expect(evalAmount("abc")).toBeNull();
    expect(evalAmount("1000/0")).toBeNull();
    expect(evalAmount("1+")).toBeNull();
    expect(evalAmount("(1+2")).toBeNull();
    expect(evalAmount("1+2)")).toBeNull();
    expect(evalAmount("2**3")).toBeNull();
  });
});
