import { describe, it, expect } from "vitest";
import { evaluateFlag, bucketOf, type FlagRecord } from "./flags";

const flag = (over: Partial<FlagRecord> = {}): FlagRecord => ({
  key: "settlement",
  enabled: true,
  rolloutPct: 100,
  tiers: null,
  ...over,
});

const who = { userId: "user-1", tier: "FREE" as const };

describe("evaluateFlag", () => {
  it("未登録のキーは無効（安全側に倒す）", () => {
    expect(evaluateFlag(undefined, who)).toBe(false);
  });

  it("無効なフラグは割合に関わらず無効", () => {
    expect(evaluateFlag(flag({ enabled: false, rolloutPct: 100 }), who)).toBe(false);
  });

  it("100%なら全員に出る", () => {
    expect(evaluateFlag(flag({ rolloutPct: 100 }), who)).toBe(true);
  });

  it("0%なら誰にも出ない", () => {
    expect(evaluateFlag(flag({ rolloutPct: 0 }), who)).toBe(false);
  });

  it("対象プラン外には出ない", () => {
    expect(evaluateFlag(flag({ tiers: ["PRO"] }), who)).toBe(false);
    expect(evaluateFlag(flag({ tiers: ["PRO"] }), { ...who, tier: "PRO" })).toBe(true);
  });

  it("空の対象プランは「全員」として扱う", () => {
    expect(evaluateFlag(flag({ tiers: [] }), who)).toBe(true);
  });
});

describe("bucketOf", () => {
  it("同じ人・同じキーなら常に同じ値（表示が点滅しない）", () => {
    const a = bucketOf("user-1", "settlement");
    for (let i = 0; i < 20; i++) expect(bucketOf("user-1", "settlement")).toBe(a);
  });

  it("キーが違えば別の抽選になる", () => {
    // 同じ人が全機能で当たり続ける/外れ続けることを避ける。
    const keys = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const values = new Set(keys.map((k) => bucketOf("user-1", k)));
    expect(values.size).toBeGreaterThan(1);
  });

  it("0〜99 に収まる", () => {
    for (let i = 0; i < 200; i++) {
      const v = bucketOf(`user-${i}`, "settlement");
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(100);
    }
  });

  it("割合どおりに概ね分かれる", () => {
    const n = 2000;
    let hit = 0;
    for (let i = 0; i < n; i++) {
      if (evaluateFlag(flag({ rolloutPct: 25 }), { userId: `u${i}`, tier: "FREE" })) hit++;
    }
    const pct = (hit / n) * 100;
    expect(pct).toBeGreaterThan(20);
    expect(pct).toBeLessThan(30);
  });
});
