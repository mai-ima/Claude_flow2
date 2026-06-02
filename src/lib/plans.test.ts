import { describe, it, expect } from "vitest";
import { canUse, tierAtLeast } from "./plans";

describe("tierAtLeast", () => {
  it("階層を正しく比較する", () => {
    expect(tierAtLeast("PRO", "PLUS")).toBe(true);
    expect(tierAtLeast("PLUS", "PLUS")).toBe(true);
    expect(tierAtLeast("FREE", "PLUS")).toBe(false);
    expect(tierAtLeast("PLUS", "PRO")).toBe(false);
  });
});

describe("canUse", () => {
  it("FREE は予算/目標を使えない", () => {
    expect(canUse("FREE", "budgets")).toBe(false);
    expect(canUse("FREE", "goals")).toBe(false);
  });
  it("PLUS は予算可・サブスクレビュー不可", () => {
    expect(canUse("PLUS", "budgets")).toBe(true);
    expect(canUse("PLUS", "subscriptionReview")).toBe(false);
  });
  it("PRO は全機能可", () => {
    expect(canUse("PRO", "subscriptionReview")).toBe(true);
    expect(canUse("PRO", "csvImport")).toBe(true);
  });
});
