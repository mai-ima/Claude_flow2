import { describe, it, expect } from "vitest";
import { buildActivityRings } from "./activity-rings";

const sum = (income: number, expense: number) => ({ income, expense, balance: income - expense });

describe("buildActivityRings", () => {
  it("予算があれば支出は予算基準", () => {
    const { rings } = buildActivityRings(sum(300000, 120000), { amount: 200000, spent: 120000 }, 5000);
    const expense = rings.find((r) => r.key === "expense")!;
    expect(expense.label).toBe("支出 / 予算");
    expect(expense.value).toBeCloseTo(0.6); // 120000/200000
    expect(expense.amount).toBe(120000);
  });

  it("予算が無ければ支出は収入基準", () => {
    const { rings } = buildActivityRings(sum(300000, 150000), null, 0);
    const expense = rings.find((r) => r.key === "expense")!;
    expect(expense.label).toBe("支出 / 収入");
    expect(expense.value).toBeCloseTo(0.5);
  });

  it("貯蓄は収支がマイナスなら0", () => {
    const { rings } = buildActivityRings(sum(200000, 250000), null, 0);
    const savings = rings.find((r) => r.key === "savings")!;
    expect(savings.value).toBe(0);
    expect(savings.amount).toBe(0);
  });

  it("貯蓄率を正しく算出", () => {
    const { rings } = buildActivityRings(sum(400000, 300000), null, 0);
    const savings = rings.find((r) => r.key === "savings")!;
    expect(savings.value).toBeCloseTo(0.25); // 100000/400000
    expect(savings.amount).toBe(100000);
  });

  it("サブスクは収入に対する割合", () => {
    const { rings } = buildActivityRings(sum(200000, 100000), null, 20000);
    const sub = rings.find((r) => r.key === "subscription")!;
    expect(sub.value).toBeCloseTo(0.1);
  });

  it("収入0・予算なしは非表示", () => {
    const { show } = buildActivityRings(sum(0, 0), null, 0);
    expect(show).toBe(false);
  });

  it("収入0でも予算があれば表示", () => {
    const { show, rings } = buildActivityRings(sum(0, 5000), { amount: 10000, spent: 5000 }, 0);
    expect(show).toBe(true);
    expect(rings.find((r) => r.key === "expense")!.value).toBeCloseTo(0.5);
  });
});
