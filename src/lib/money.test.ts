import { describe, it, expect } from "vitest";
import {
  toMonthlyAmount,
  toYearlyAmount,
  amountToWorkMinutes,
  formatWorkTime,
  formatMoney,
} from "./money";

describe("money", () => {
  it("月額換算", () => {
    expect(toMonthlyAmount(1200, "MONTHLY")).toBe(1200);
    expect(toMonthlyAmount(12000, "YEARLY")).toBe(1000);
    expect(toMonthlyAmount(3000, "QUARTERLY")).toBe(1000);
  });

  it("年額換算", () => {
    expect(toYearlyAmount(1000, "MONTHLY")).toBe(12000);
    expect(toYearlyAmount(9800, "YEARLY")).toBe(9800);
    expect(toYearlyAmount(1000, "QUARTERLY")).toBe(4000);
  });

  it("コストタイム換算", () => {
    expect(amountToWorkMinutes(2000, 2000)).toBe(60);
    expect(amountToWorkMinutes(1000, 2000)).toBe(30);
    expect(amountToWorkMinutes(1000, 0)).toBe(0);
  });

  it("労働時間の整形", () => {
    expect(formatWorkTime(90)).toBe("1時間30分");
    expect(formatWorkTime(60)).toBe("1時間");
    expect(formatWorkTime(0)).toBe("0分");
  });

  it("JPY は小数なしで整形", () => {
    expect(formatMoney(1490)).toBe("￥1,490");
  });
});
