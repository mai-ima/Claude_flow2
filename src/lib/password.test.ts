import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("正しいパスワードを検証できる", () => {
    const stored = hashPassword("demo1234");
    expect(verifyPassword("demo1234", stored)).toBe(true);
  });

  it("誤ったパスワードは拒否する", () => {
    const stored = hashPassword("demo1234");
    expect(verifyPassword("wrongpass", stored)).toBe(false);
  });

  it("毎回異なるソルトでハッシュ化される", () => {
    expect(hashPassword("samepass")).not.toBe(hashPassword("samepass"));
  });

  it("壊れた保存値は false", () => {
    expect(verifyPassword("x", "not-a-valid-hash")).toBe(false);
  });
});
