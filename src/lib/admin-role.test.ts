import { describe, it, expect } from "vitest";
import { hasAdminRole, effectiveAdminRole, isAdminRole } from "./admin-role";

describe("hasAdminRole", () => {
  it("上位の権限は下位の要求を満たす", () => {
    expect(hasAdminRole("SUPER", "READONLY")).toBe(true);
    expect(hasAdminRole("SUPER", "SUPPORT")).toBe(true);
    expect(hasAdminRole("SUPPORT", "READONLY")).toBe(true);
  });

  it("下位の権限は上位の要求を満たさない", () => {
    expect(hasAdminRole("READONLY", "SUPPORT")).toBe(false);
    expect(hasAdminRole("SUPPORT", "SUPER")).toBe(false);
    expect(hasAdminRole("NONE", "READONLY")).toBe(false);
  });

  it("知らない値は権限なしとして扱う（フェイルクローズ）", () => {
    expect(hasAdminRole("WHATEVER", "READONLY")).toBe(false);
    expect(hasAdminRole("", "READONLY")).toBe(false);
  });
});

describe("effectiveAdminRole", () => {
  // 移行中は isAdmin と adminRole が併存する。
  it("adminRole が設定されていればそれを使う", () => {
    expect(effectiveAdminRole("READONLY", false)).toBe("READONLY");
    expect(effectiveAdminRole("SUPPORT", true)).toBe("SUPPORT");
  });

  it("adminRole が未設定でも isAdmin なら全権として扱う", () => {
    expect(effectiveAdminRole("NONE", true)).toBe("SUPER");
  });

  it("どちらも無ければ権限なし", () => {
    expect(effectiveAdminRole("NONE", false)).toBe("NONE");
    expect(effectiveAdminRole("こわれた値", false)).toBe("NONE");
  });
});

describe("isAdminRole", () => {
  it("定義済みの値だけ受け付ける", () => {
    expect(isAdminRole("SUPER")).toBe(true);
    expect(isAdminRole("ADMIN")).toBe(false);
    expect(isAdminRole(3)).toBe(false);
  });
});
