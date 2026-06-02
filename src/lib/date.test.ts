import { describe, it, expect } from "vitest";
import { advanceRenewal, daysUntil, daysSince } from "./date";

describe("advanceRenewal", () => {
  const base = new Date("2026-01-15T00:00:00");
  it("月次は1ヶ月後", () => {
    expect(advanceRenewal(base, "MONTHLY").getMonth()).toBe(1); // 2月
  });
  it("年次は1年後", () => {
    expect(advanceRenewal(base, "YEARLY").getFullYear()).toBe(2027);
  });
  it("四半期は3ヶ月後", () => {
    expect(advanceRenewal(base, "QUARTERLY").getMonth()).toBe(3); // 4月
  });
  it("週次は7日後", () => {
    expect(advanceRenewal(base, "WEEKLY").getDate()).toBe(22);
  });
});

describe("daysUntil / daysSince", () => {
  const now = new Date("2026-06-01T12:00:00");
  it("daysUntil 未来は正", () => {
    expect(daysUntil(new Date("2026-06-04T00:00:00"), now)).toBe(3);
  });
  it("daysSince 過去は正、null は null", () => {
    expect(daysSince(new Date("2026-05-29T00:00:00"), now)).toBe(3);
    expect(daysSince(null, now)).toBeNull();
  });
});
