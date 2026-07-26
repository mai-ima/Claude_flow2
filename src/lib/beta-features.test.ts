import { describe, it, expect } from "vitest";
import {
  BETA_FEATURES,
  isBetaEnabled,
  enabledBetaFeatures,
  parseBetaFeatures,
  isBetaFeatureKey,
} from "./beta-features";

describe("parseBetaFeatures", () => {
  it("配列以外は未指定として扱う", () => {
    expect(parseBetaFeatures(null)).toBeNull();
    expect(parseBetaFeatures(undefined)).toBeNull();
    expect(parseBetaFeatures("amount_pad")).toBeNull();
    expect(parseBetaFeatures({})).toBeNull();
  });

  it("知らないキーは捨てる", () => {
    expect(parseBetaFeatures(["amount_pad", "unknown", 42])).toEqual(["amount_pad"]);
  });

  it("空配列は「全部オフ」として保持する", () => {
    expect(parseBetaFeatures([])).toEqual([]);
  });
});

describe("isBetaEnabled", () => {
  it("親スイッチがオフなら常に無効", () => {
    expect(isBetaEnabled({ optIn: false, features: null }, "amount_pad")).toBe(false);
    expect(isBetaEnabled({ optIn: false, features: ["amount_pad"] }, "amount_pad")).toBe(false);
  });

  it("親オン かつ 未指定なら全て有効（既存ユーザーの挙動を維持）", () => {
    for (const f of BETA_FEATURES) {
      expect(isBetaEnabled({ optIn: true, features: null }, f.key)).toBe(true);
    }
  });

  it("親オン かつ 個別指定なら、指定したものだけ有効", () => {
    const state = { optIn: true, features: ["amount_pad" as const] };
    expect(isBetaEnabled(state, "amount_pad")).toBe(true);
    expect(isBetaEnabled(state, "haptics")).toBe(false);
  });

  it("親オン かつ 空配列なら全て無効", () => {
    expect(isBetaEnabled({ optIn: true, features: [] }, "amount_pad")).toBe(false);
  });
});

describe("enabledBetaFeatures", () => {
  it("親オフなら空", () => {
    expect(enabledBetaFeatures({ optIn: false, features: null })).toEqual([]);
  });

  it("未指定なら全キー", () => {
    expect(enabledBetaFeatures({ optIn: true, features: null })).toHaveLength(BETA_FEATURES.length);
  });

  it("指定があればそれを返す", () => {
    expect(enabledBetaFeatures({ optIn: true, features: ["haptics"] })).toEqual(["haptics"]);
  });
});

describe("親オフからの個別オンを想定した展開", () => {
  // 親を見ずに展開すると、1つ入れたつもりが全機能オンになる回帰があった。
  it("親オフ・未指定なら実効値は空", () => {
    expect(enabledBetaFeatures({ optIn: false, features: null })).toEqual([]);
  });

  it("親オン・未指定なら実効値は全件", () => {
    expect(enabledBetaFeatures({ optIn: true, features: null })).toHaveLength(BETA_FEATURES.length);
  });
});

describe("isBetaFeatureKey", () => {
  it("登録簿のキーだけを受け付ける", () => {
    expect(isBetaFeatureKey("amount_pad")).toBe(true);
    expect(isBetaFeatureKey("nope")).toBe(false);
    expect(isBetaFeatureKey(1)).toBe(false);
  });
});
