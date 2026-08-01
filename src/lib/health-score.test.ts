import { describe, expect, it } from "vitest";
import { healthScore, type HealthInput } from "./health-score";

const base: HealthInput = {
  income: 300000,
  expense: 240000,
  budget: 250000,
  subscriptionMonthly: 20000,
  transactionCount: 40,
  recordedDays: 18,
  daysInMonth: 30,
};

const factorOf = (input: Partial<HealthInput>, key: string) =>
  healthScore({ ...base, ...input }).factors.find((f) => f.key === key)!;

describe("healthScore", () => {
  it("0〜100 に収まる", () => {
    const r = healthScore(base);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("全項目が判定できれば4つ数える", () => {
    expect(healthScore(base).measured).toBe(4);
  });

  it("どの項目にも根拠と次の一手が付く", () => {
    for (const f of healthScore(base).factors) {
      expect(f.evidence.length).toBeGreaterThan(0);
      expect(f.advice.length).toBeGreaterThan(0);
    }
  });

  it("何も記録が無ければ判定できないと言う", () => {
    const r = healthScore({
      income: 0,
      expense: 0,
      budget: null,
      subscriptionMonthly: 0,
      transactionCount: 0,
      recordedDays: 0,
      daysInMonth: 30,
    });
    expect(r.level).toBe("unknown");
    expect(r.measured).toBe(0);
    expect(r.score).toBe(0);
  });

  it("データの無い項目は分母から外す", () => {
    // 予算だけ未設定。残り3項目で割り戻す。
    const r = healthScore({ ...base, budget: null });
    expect(r.measured).toBe(3);
    expect(r.factors.find((f) => f.key === "budget")?.score).toBeNull();
  });

  it("使い始めでも不当に低くならない", () => {
    // 収入と予算はまだ無いが、支出はきちんと記録できている状態。
    const r = healthScore({
      income: 0,
      expense: 50000,
      budget: null,
      subscriptionMonthly: 2000,
      transactionCount: 20,
      recordedDays: 15,
      daysInMonth: 30,
    });
    expect(r.measured).toBe(2);
    expect(r.score).toBe(100);
  });
});

describe("貯蓄率", () => {
  it("20%残せていれば満点", () => {
    const f = factorOf({ income: 300000, expense: 240000 }, "savings");
    expect(f.score).toBe(25);
    expect(f.level).toBe("good");
  });

  it("使いすぎた月は0点", () => {
    const f = factorOf({ income: 200000, expense: 260000 }, "savings");
    expect(f.score).toBe(0);
    expect(f.level).toBe("poor");
  });

  it("20%を超えても満点どまり", () => {
    const f = factorOf({ income: 300000, expense: 100000 }, "savings");
    expect(f.score).toBe(25);
  });

  it("収入が無い月は判定しない", () => {
    const f = factorOf({ income: 0 }, "savings");
    expect(f.score).toBeNull();
    expect(f.level).toBe("unknown");
    expect(f.evidence).toContain("収入の記録がない");
  });

  it("根拠に実際の金額と割合を書く", () => {
    const f = factorOf({ income: 300000, expense: 240000 }, "savings");
    expect(f.evidence).toContain("300,000");
    expect(f.evidence).toContain("20%");
  });
});

describe("予算", () => {
  it("予算内なら満点", () => {
    const f = factorOf({ budget: 250000, expense: 240000 }, "budget");
    expect(f.score).toBe(25);
  });

  it("ちょうど使い切っても満点", () => {
    const f = factorOf({ budget: 240000, expense: 240000 }, "budget");
    expect(f.score).toBe(25);
  });

  it("50%超過で0点", () => {
    const f = factorOf({ budget: 100000, expense: 150000 }, "budget");
    expect(f.score).toBe(0);
  });

  it("超過分は根拠に割合で書く", () => {
    const f = factorOf({ budget: 100000, expense: 120000 }, "budget");
    expect(f.evidence).toContain("20% 超えています");
  });

  it("予算未設定は判定しない", () => {
    const f = factorOf({ budget: null }, "budget");
    expect(f.score).toBeNull();
    expect(f.advice).toContain("予算の画面");
  });
});

describe("固定費", () => {
  it("支出の10%以内なら満点", () => {
    const f = factorOf({ expense: 200000, subscriptionMonthly: 20000 }, "fixed");
    expect(f.score).toBe(25);
  });

  it("30%で0点", () => {
    const f = factorOf({ expense: 100000, subscriptionMonthly: 30000 }, "fixed");
    expect(f.score).toBe(0);
  });

  it("サブスクが無ければ満点", () => {
    const f = factorOf({ expense: 100000, subscriptionMonthly: 0 }, "fixed");
    expect(f.score).toBe(25);
  });

  it("支出が無い月は判定しない", () => {
    const f = factorOf({ expense: 0 }, "fixed");
    expect(f.score).toBeNull();
  });
});

describe("記録の続き方", () => {
  it("半分の日数つけていれば満点", () => {
    const f = factorOf({ recordedDays: 15, daysInMonth: 30 }, "habit");
    expect(f.score).toBe(25);
  });

  it("毎日つけても満点どまり（まとめ入力を罰しない）", () => {
    const f = factorOf({ recordedDays: 30, daysInMonth: 30 }, "habit");
    expect(f.score).toBe(25);
  });

  it("日数が少なければ比例して下がる", () => {
    const f = factorOf({ recordedDays: 3, daysInMonth: 30 }, "habit");
    expect(f.score).toBe(5);
  });

  it("記録が1件も無ければ判定しない", () => {
    const f = factorOf({ transactionCount: 0 }, "habit");
    expect(f.score).toBeNull();
  });

  it("根拠に日数を書く", () => {
    const f = factorOf({ recordedDays: 18, daysInMonth: 30 }, "habit");
    expect(f.evidence).toContain("30日のうち 18日");
  });
});

describe("実データで壊れた組み合わせ", () => {
  it("先の日付の記録が混ざっても文がおかしくならない", () => {
    // 月初（1日目）に、月内の先の日付ぶんまで記録があった場合。
    // 丸めていないと「1日のうち 6日 に記録があります」と出る。
    const f = healthScore({
      ...base,
      recordedDays: 6,
      daysInMonth: 1,
    }).factors.find((x) => x.key === "habit")!;
    expect(f.evidence).toBe("1日のうち 1日 に記録があります（満点は半分の日数）。");
    expect(f.score).toBe(25);
  });

  it("分子が分母を超えても満点どまり", () => {
    const r = healthScore({ ...base, recordedDays: 99, daysInMonth: 3 });
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
