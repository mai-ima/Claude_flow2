import { describe, it, expect } from "vitest";
import { detectWaste } from "./waste-detect";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

describe("detectWaste", () => {
  it("90日以上未使用は waste", () => {
    expect(detectWaste(daysAgo(120), "ACTIVE")).toBe("waste");
  });
  it("45〜89日は watch", () => {
    expect(detectWaste(daysAgo(60), "ACTIVE")).toBe("watch");
  });
  it("最近使っていれば none", () => {
    expect(detectWaste(daysAgo(2), "ACTIVE")).toBe("none");
  });
  it("利用記録なしは判定しない（none）", () => {
    expect(detectWaste(null, "ACTIVE")).toBe("none");
  });
  it("解約済みは none", () => {
    expect(detectWaste(daysAgo(200), "CANCELED")).toBe("none");
  });
});
