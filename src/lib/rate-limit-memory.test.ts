import { describe, expect, it, beforeEach } from "vitest";
import {
  memoryRateLimit,
  resetMemoryRateLimit,
  memoryRateLimitSize,
} from "./rate-limit-memory";

beforeEach(() => resetMemoryRateLimit());

describe("memoryRateLimit", () => {
  it("上限までは通す", () => {
    for (let i = 0; i < 3; i++) {
      expect(memoryRateLimit("k", 3, 60).ok, `${i + 1}回目`).toBe(true);
    }
  });

  it("上限を超えたら止める", () => {
    for (let i = 0; i < 3; i++) memoryRateLimit("k", 3, 60);
    expect(memoryRateLimit("k", 3, 60).ok).toBe(false);
  });

  it("残り回数を返す", () => {
    expect(memoryRateLimit("k", 3, 60).remaining).toBe(2);
    expect(memoryRateLimit("k", 3, 60).remaining).toBe(1);
    expect(memoryRateLimit("k", 3, 60).remaining).toBe(0);
    expect(memoryRateLimit("k", 3, 60).remaining).toBe(0);
  });

  it("キーごとに別勘定", () => {
    for (let i = 0; i < 3; i++) memoryRateLimit("a", 3, 60);
    expect(memoryRateLimit("a", 3, 60).ok).toBe(false);
    expect(memoryRateLimit("b", 3, 60).ok).toBe(true);
  });

  it("ウィンドウが切れたら数え直す", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) memoryRateLimit("k", 3, 60, t0);
    expect(memoryRateLimit("k", 3, 60, t0).ok).toBe(false);
    // 60秒後
    expect(memoryRateLimit("k", 3, 60, t0 + 60_001).ok).toBe(true);
  });

  it("ウィンドウ内は時刻が進んでも同じ勘定", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) memoryRateLimit("k", 3, 60, t0 + i * 1000);
    expect(memoryRateLimit("k", 3, 60, t0 + 59_000).ok).toBe(false);
  });

  it("期限切れのキーは溜め込まない", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 50; i++) memoryRateLimit(`k${i}`, 1, 1, t0);
    expect(memoryRateLimitSize()).toBe(50);
    // 全て期限切れになったあと、新しいキーで掃除が走る
    for (let i = 0; i < 50; i++) memoryRateLimit(`k${i}`, 1, 1, t0 + 5000);
    expect(memoryRateLimitSize()).toBe(50);
  });
});
