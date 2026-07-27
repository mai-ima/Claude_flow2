import { describe, it, expect } from "vitest";
import { percentDelta, perDayToGoal, unusedEvidence } from "./notify-evidence";

describe("percentDelta", () => {
  it("値上げ率を1桁で出す", () => {
    // 仕様書の例: ¥1,490 → ¥1,890 は +26.8%
    expect(percentDelta(1490, 1890)).toBe("+26.8%");
  });

  it("値下げはマイナスで出す", () => {
    expect(percentDelta(1000, 900)).toBe("-10.0%");
  });

  it("変化なしは +0.0%", () => {
    expect(percentDelta(1000, 1000)).toBe("+0.0%");
  });

  it("基準が0以下なら率を出さない（0除算を文面に出さない）", () => {
    expect(percentDelta(0, 500)).toBe("");
    expect(percentDelta(-100, 500)).toBe("");
  });
});

describe("perDayToGoal", () => {
  it("残額を残り日数で割って切り上げる", () => {
    expect(perDayToGoal(10000, 7)).toBe(1429);
  });

  it("残り日数0でも割り切れる（1日として扱う）", () => {
    expect(perDayToGoal(10000, 0)).toBe(10000);
    expect(perDayToGoal(10000, -3)).toBe(10000);
  });

  it("達成済みは0", () => {
    expect(perDayToGoal(0, 5)).toBe(0);
    expect(perDayToGoal(-500, 5)).toBe(0);
  });
});

describe("unusedEvidence", () => {
  it("しきい値以上なら日数を明記する", () => {
    expect(unusedEvidence(90, 90)).toBe("90日間 利用記録がありません");
    expect(unusedEvidence(120, 90)).toBe("120日間 利用記録がありません");
  });

  it("しきい値未満は通知しない", () => {
    expect(unusedEvidence(89, 90)).toBeNull();
  });

  it("利用記録が無い場合は判定しない", () => {
    expect(unusedEvidence(null, 90)).toBeNull();
  });
});
