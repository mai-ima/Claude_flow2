import { describe, it, expect } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("自サイト内のパスはそのまま", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard");
    expect(safeNext("/transactions?view=calendar")).toBe("/transactions?view=calendar");
  });

  it("未指定は既定へ", () => {
    expect(safeNext()).toBe("/billing");
    expect(safeNext("")).toBe("/billing");
    expect(safeNext(null)).toBe("/billing");
  });

  it("絶対URLは拒否", () => {
    expect(safeNext("https://evil.com")).toBe("/billing");
    expect(safeNext("http://evil.com")).toBe("/billing");
  });

  it("プロトコル相対URLは拒否", () => {
    expect(safeNext("//evil.com")).toBe("/billing");
    expect(safeNext("//evil.com/path")).toBe("/billing");
  });

  it("バックスラッシュ始まりも拒否", () => {
    expect(safeNext("/\\evil.com")).toBe("/billing");
  });

  it("スキーム付きの相対風も拒否", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/billing");
  });
});
