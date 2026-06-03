import { describe, it, expect } from "vitest";
import { budgetHealth, budgetInsight, PACE_LABEL } from "./budget-insight";

describe("budgetHealth", () => {
  it("80%未満は安全", () => {
    expect(budgetHealth(5000, 10000)).toBe("safe");
  });
  it("80%以上は注意", () => {
    expect(budgetHealth(8000, 10000)).toBe("warning");
  });
  it("100%超は超過", () => {
    expect(budgetHealth(12000, 10000)).toBe("over");
  });
  it("予算0は安全扱い", () => {
    expect(budgetHealth(100, 0)).toBe("safe");
  });
});

describe("budgetInsight", () => {
  const month = new Date(2026, 5, 1); // 6月（30日）

  it("今月の残り日数で日割りを計算する", () => {
    const now = new Date(2026, 5, 21); // 6/21 → 残り10日
    const i = budgetInsight(30000, 60000, month, now);
    expect(i.daysLeft).toBe(10);
    expect(i.dailyAllowance).toBe(3000); // 残3万 / 10日
    expect(i.over).toBe(false);
  });

  it("超過時は日割り0・ペースover", () => {
    const now = new Date(2026, 5, 21);
    const i = budgetInsight(70000, 60000, month, now);
    expect(i.over).toBe(true);
    expect(i.dailyAllowance).toBe(0);
    expect(i.pace).toBe("over");
    expect(i.health).toBe("over");
  });

  it("経過割合より消化が先行すると使いすぎ気味", () => {
    const now = new Date(2026, 5, 6); // 月の20%経過
    const i = budgetInsight(45000, 60000, month, now); // 75%消化
    expect(i.pace).toBe("tight");
  });

  it("経過と消化が釣り合えばペース良好", () => {
    const now = new Date(2026, 5, 15); // 約半分経過
    const i = budgetInsight(30000, 60000, month, now); // 50%消化
    expect(i.pace).toBe("good");
  });

  it("過去/別月は月全体の日数を使う", () => {
    const now = new Date(2026, 6, 10); // 7月から6月を見る
    const i = budgetInsight(30000, 60000, month, now);
    expect(i.daysLeft).toBe(30);
  });

  it("PACE_LABEL が全状態を網羅する", () => {
    expect(PACE_LABEL.good).toBeTruthy();
    expect(PACE_LABEL.tight).toBeTruthy();
    expect(PACE_LABEL.over).toBeTruthy();
  });
});
