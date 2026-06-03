import { describe, it, expect } from "vitest";
import { monthEndForecast, weekDelta } from "./insight";

describe("monthEndForecast", () => {
  it("半分経過で支出の倍を予測（30日月の15日）", () => {
    // 6月=30日。15日時点で 30000 → 60000
    expect(monthEndForecast(30000, new Date(2026, 5, 15))).toBe(60000);
  });
  it("月初・支出0は0", () => {
    expect(monthEndForecast(0, new Date(2026, 5, 1))).toBe(0);
  });
  it("月末は概ね実支出", () => {
    expect(monthEndForecast(50000, new Date(2026, 5, 30))).toBe(50000);
  });
});

describe("weekDelta", () => {
  it("増加", () => {
    const d = weekDelta(12000, 10000);
    expect(d.diff).toBe(2000);
    expect(d.pct).toBe(20);
    expect(d.trend).toBe("up");
  });
  it("減少", () => {
    const d = weekDelta(8000, 10000);
    expect(d.trend).toBe("down");
    expect(d.pct).toBe(-20);
  });
  it("先週0は pct null", () => {
    const d = weekDelta(5000, 0);
    expect(d.pct).toBeNull();
    expect(d.trend).toBe("up");
  });
  it("同額は flat", () => {
    expect(weekDelta(5000, 5000).trend).toBe("flat");
  });
});
