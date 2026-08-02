import { describe, it, expect } from "vitest";
import { monthEndForecast, weekDelta, savingsRate, FORECAST_MIN_DAYS } from "./insight";

describe("monthEndForecast", () => {
  it("半分経過で支出の倍を予測（30日月の15日）", () => {
    // 6月=30日。15日時点で 30000 → 60000
    expect(monthEndForecast(30000, new Date(2026, 5, 15))).toBe(60000);
  });
  it("月初は支出0でも予測しない", () => {
    // 0 を返すと「今月は0円で終わる」と読めてしまう。
    expect(monthEndForecast(0, new Date(2026, 5, 1))).toBeNull();
  });
  it("月末は概ね実支出", () => {
    expect(monthEndForecast(50000, new Date(2026, 5, 30))).toBe(50000);
  });

  // 実際に出た表示: 8月1日に「今月の着地予測 ￥5,111,900」。
  // 1日ぶんの支出をそのまま31倍していた。
  it("月初は予測を出さない", () => {
    expect(monthEndForecast(164900, new Date(2026, 7, 1))).toBeNull();
    expect(monthEndForecast(164900, new Date(2026, 7, 2))).toBeNull();
  });

  it("日数がたてば予測を出す", () => {
    const r = monthEndForecast(30000, new Date(2026, 7, FORECAST_MIN_DAYS));
    expect(r).not.toBeNull();
    // 8月=31日。3日で 30,000 → 31日で 310,000
    expect(r).toBe(310000);
  });

  it("日数がたっていて支出0なら0", () => {
    expect(monthEndForecast(0, new Date(2026, 7, 20))).toBe(0);
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

describe("savingsRate", () => {
  it("収入の2割を残せば20%", () => {
    expect(savingsRate(500000, 400000)).toBe(20);
  });

  it("支出が収入を上回るとマイナス", () => {
    expect(savingsRate(200000, 300000)).toBe(-50);
  });

  it("使い切りは0%", () => {
    expect(savingsRate(300000, 300000)).toBe(0);
  });

  it("収入が無い月は算出不能（0%と区別）", () => {
    expect(savingsRate(0, 50000)).toBeNull();
    expect(savingsRate(0, 0)).toBeNull();
  });
});

describe("着地予測を日本時間で数える", () => {
  it("日本時間の朝は、まだ同じ日として数える", () => {
    // 2026-08-04T00:00Z は日本時間の 8/4 09:00（4日目）。
    // UTC で数えると 4日目、日本時間でも 4日目。ここは一致する。
    expect(monthEndForecast(40000, new Date("2026-08-04T00:00:00Z"))).toBe(310000);
  });

  it("日本時間で日付が変わった直後は、新しい日として数える", () => {
    // 2026-08-03T15:00Z は日本時間の 8/4 00:00。UTC ではまだ 8/3。
    // 日本時間で数えれば 4日目なので、UTC で数えた場合と結果が変わる。
    expect(monthEndForecast(40000, new Date("2026-08-03T15:00:00Z"))).toBe(310000);
  });

  it("日本時間で 3日目に満たなければ予測しない", () => {
    // 日本時間の 8/2 23:59（= 8/2T14:59Z）はまだ 2日目。
    expect(monthEndForecast(40000, new Date("2026-08-02T14:59:00Z"))).toBeNull();
  });
});
