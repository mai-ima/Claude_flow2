import { describe, expect, it } from "vitest";
import {
  summarizePriceChanges,
  cancelImpact,
  usagePeriod,
  estimatedTotalPaid,
  reviewAge,
  needsReview,
} from "./insights";

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe("summarizePriceChanges", () => {
  it("差額と変化率を出す", () => {
    const [r] = summarizePriceChanges([
      {
        subscriptionId: "s1",
        name: "Netflix",
        oldAmount: 1490,
        newAmount: 1890,
        changedAt: at(2026, 5, 1),
        cycle: "MONTHLY",
      },
    ]);
    expect(r.diff).toBe(400);
    expect(r.percent).toBeCloseTo(26.85, 1);
    expect(r.yearlyDiff).toBe(4800);
  });

  it("値下げはマイナスで出る", () => {
    const [r] = summarizePriceChanges([
      {
        subscriptionId: "s1",
        name: "X",
        oldAmount: 1000,
        newAmount: 800,
        changedAt: at(2026, 5, 1),
        cycle: "MONTHLY",
      },
    ]);
    expect(r.diff).toBe(-200);
    expect(r.percent).toBeCloseTo(-20, 5);
  });

  it("年額への影響が大きい順に並ぶ", () => {
    const rows = summarizePriceChanges([
      {
        subscriptionId: "m",
        name: "月払い",
        oldAmount: 1000,
        newAmount: 1100,
        changedAt: at(2026, 5, 1),
        cycle: "MONTHLY",
      },
      {
        subscriptionId: "y",
        name: "年払い",
        oldAmount: 5000,
        newAmount: 8000,
        changedAt: at(2026, 5, 1),
        cycle: "YEARLY",
      },
    ]);
    // 月払いは年 +1,200 / 年払いは年 +3,000
    expect(rows.map((r) => r.subscriptionId)).toEqual(["y", "m"]);
  });

  it("元が0円なら変化率は出さない", () => {
    const [r] = summarizePriceChanges([
      {
        subscriptionId: "s",
        name: "X",
        oldAmount: 0,
        newAmount: 500,
        changedAt: at(2026, 5, 1),
        cycle: "MONTHLY",
      },
    ]);
    expect(r.percent).toBeNull();
  });
});

describe("cancelImpact", () => {
  it("年額と月額を出す", () => {
    const r = cancelImpact(6480, "MONTHLY", null);
    expect(r.yearly).toBe(77760);
    expect(r.monthly).toBe(6480);
  });

  it("想定時給があれば労働時間に換算する", () => {
    const r = cancelImpact(6480, "MONTHLY", 2000);
    // 77,760 円 ÷ 2,000 円/時 = 38.88 時間 = 2332.8 分
    expect(r.workMinutes).toBeCloseTo(2332.8, 0);
  });

  it("想定時給が無ければ換算しない", () => {
    expect(cancelImpact(1000, "MONTHLY", null).workMinutes).toBeNull();
    expect(cancelImpact(1000, "MONTHLY", 0).workMinutes).toBeNull();
  });
});

describe("usagePeriod", () => {
  it("年と月で表す", () => {
    expect(usagePeriod(at(2024, 3, 10), at(2026, 6, 15))?.label).toBe("2年3か月");
  });

  it("ちょうど年なら月を出さない", () => {
    expect(usagePeriod(at(2024, 6, 15), at(2026, 6, 15))?.label).toBe("2年");
  });

  it("1年未満は月だけ", () => {
    expect(usagePeriod(at(2026, 1, 10), at(2026, 6, 15))?.label).toBe("5か月");
  });

  it("日をまたいでいない月は数えない", () => {
    expect(usagePeriod(at(2026, 1, 20), at(2026, 6, 15))?.months).toBe(4);
  });

  it("開始日が無ければ null", () => {
    expect(usagePeriod(null)).toBeNull();
  });

  it("未来の開始日は null", () => {
    expect(usagePeriod(at(2027, 1, 1), at(2026, 6, 15))).toBeNull();
  });
});

describe("estimatedTotalPaid", () => {
  it("経過月数ぶんを積む", () => {
    // 月1,490円を27ヶ月 → 40,230
    expect(estimatedTotalPaid(1490, "MONTHLY", at(2024, 3, 15), at(2026, 6, 15))).toBe(40230);
  });

  it("年払いも月割りで積む", () => {
    expect(estimatedTotalPaid(12000, "YEARLY", at(2025, 6, 15), at(2026, 6, 15))).toBe(12000);
  });

  it("開始日が無ければ null", () => {
    expect(estimatedTotalPaid(1000, "MONTHLY", null)).toBeNull();
  });
});

describe("reviewAge / needsReview", () => {
  const now = at(2026, 6, 15);

  it("当日は「今日」", () => {
    expect(reviewAge(now, now)?.label).toBe("今日");
  });

  it("1ヶ月未満は日数", () => {
    expect(reviewAge(at(2026, 6, 1), now)?.label).toBe("14日前");
  });

  it("1ヶ月以上は月数", () => {
    expect(reviewAge(at(2026, 3, 15), now)?.label).toBe("3か月前");
  });

  it("1年以上は年数", () => {
    expect(reviewAge(at(2024, 6, 15), now)?.label).toBe("2年前");
  });

  it("未レビューは見直し対象", () => {
    expect(needsReview(null, now)).toBe(true);
  });

  it("90日を過ぎたら見直し対象", () => {
    expect(needsReview(at(2026, 3, 1), now)).toBe(true);
    expect(needsReview(at(2026, 6, 1), now)).toBe(false);
  });
});
