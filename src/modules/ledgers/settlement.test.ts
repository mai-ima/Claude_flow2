import { describe, expect, it } from "vitest";
import {
  fairShares,
  balances,
  minimalTransfers,
  settledAmounts,
  type Balance,
} from "./settlement";

const m = (userId: string, shareRatio = 1) => ({ userId, shareRatio });

describe("fairShares", () => {
  it("均等に分ける", () => {
    const r = fairShares(3000, [m("a"), m("b"), m("c")]);
    expect(r.map((x) => x.owed)).toEqual([1000, 1000, 1000]);
  });

  it("端数は捨てずに誰かが負担する", () => {
    const r = fairShares(1000, [m("a"), m("b"), m("c")]);
    expect(r.reduce((s, x) => s + x.owed, 0)).toBe(1000);
    expect(r.map((x) => x.owed).sort()).toEqual([333, 333, 334]);
  });

  it("同じ入力なら毎回同じ人が端数を負担する", () => {
    const a = fairShares(1000, [m("b"), m("a"), m("c")]);
    const b = fairShares(1000, [m("b"), m("a"), m("c")]);
    expect(a).toEqual(b);
  });

  it("重みの比で分ける", () => {
    const r = fairShares(10000, [m("a", 3), m("b", 2)]);
    expect(r.find((x) => x.userId === "a")?.owed).toBe(6000);
    expect(r.find((x) => x.userId === "b")?.owed).toBe(4000);
  });

  it("割合をパーセントで返す", () => {
    const r = fairShares(10000, [m("a", 3), m("b", 1)]);
    expect(r.find((x) => x.userId === "a")?.percent).toBeCloseTo(75, 5);
    expect(r.find((x) => x.userId === "b")?.percent).toBeCloseTo(25, 5);
  });

  it("重み0の人は負担しない", () => {
    const r = fairShares(1000, [m("a", 1), m("b", 0)]);
    expect(r.find((x) => x.userId === "b")?.owed).toBe(0);
    expect(r.find((x) => x.userId === "a")?.owed).toBe(1000);
  });

  it("全員が重み0なら誰にも割り当てない", () => {
    const r = fairShares(1000, [m("a", 0), m("b", 0)]);
    expect(r.every((x) => x.owed === 0)).toBe(true);
  });

  it("メンバーがいなければ空", () => {
    expect(fairShares(1000, [])).toEqual([]);
  });

  it("総額0なら全員0", () => {
    const r = fairShares(0, [m("a"), m("b")]);
    expect(r.every((x) => x.owed === 0)).toBe(true);
  });

  it("何人でも合計は総額に一致する", () => {
    for (const n of [2, 3, 7, 11]) {
      const members = Array.from({ length: n }, (_, i) => m(`u${i}`));
      const r = fairShares(99991, members);
      expect(r.reduce((s, x) => s + x.owed, 0)).toBe(99991);
    }
  });
});

describe("balances", () => {
  it("払った額から負担額を引く", () => {
    const shares = fairShares(3000, [m("a"), m("b"), m("c")]);
    const r = balances(shares, new Map([["a", 3000]]));
    expect(r.find((x) => x.userId === "a")?.net).toBe(2000);
    expect(r.find((x) => x.userId === "b")?.net).toBe(-1000);
  });

  it("精算済みぶんを差し引く", () => {
    const shares = fairShares(3000, [m("a"), m("b"), m("c")]);
    // a が 3000 立て替え、b から 1000 受け取り済み
    const r = balances(
      shares,
      new Map([["a", 3000]]),
      new Map([
        ["a", 1000],
        ["b", -1000],
      ]),
    );
    expect(r.find((x) => x.userId === "a")?.net).toBe(1000);
    expect(r.find((x) => x.userId === "b")?.net).toBe(0);
  });

  it("差引の合計は0になる", () => {
    const shares = fairShares(7777, [m("a"), m("b"), m("c")]);
    const r = balances(shares, new Map([["a", 5000], ["b", 2777]]));
    expect(r.reduce((s, x) => s + x.net, 0)).toBe(0);
  });
});

describe("minimalTransfers", () => {
  const bal = (userId: string, net: number): Balance => ({
    userId,
    owed: 0,
    paid: 0,
    settled: 0,
    net,
  });

  it("1対1の受け渡し", () => {
    const t = minimalTransfers([bal("a", 1000), bal("b", -1000)]);
    expect(t).toEqual([{ fromUserId: "b", toUserId: "a", amount: 1000 }]);
  });

  it("差引が0なら何もしない", () => {
    expect(minimalTransfers([bal("a", 0), bal("b", 0)])).toEqual([]);
  });

  it("3人でも回数が人数未満に収まる", () => {
    const t = minimalTransfers([bal("a", 2000), bal("b", -1500), bal("c", -500)]);
    expect(t.length).toBe(2);
    expect(t.every((x) => x.toUserId === "a")).toBe(true);
    expect(t.reduce((s, x) => s + x.amount, 0)).toBe(2000);
  });

  it("受け取る側が複数でも辻褄が合う", () => {
    const rows = [bal("a", 1200), bal("b", 800), bal("c", -2000)];
    const t = minimalTransfers(rows);
    expect(t.reduce((s, x) => s + x.amount, 0)).toBe(2000);
    expect(t.every((x) => x.fromUserId === "c")).toBe(true);
  });

  it("元の配列を書き換えない", () => {
    const rows = [bal("a", 1000), bal("b", -1000)];
    minimalTransfers(rows);
    expect(rows[0].net).toBe(1000);
    expect(rows[1].net).toBe(-1000);
  });
});

describe("settledAmounts", () => {
  it("受け取りはプラス、支払いはマイナス", () => {
    const r = settledAmounts([{ fromUserId: "b", toUserId: "a", amount: 500 }]);
    expect(r.get("a")).toBe(500);
    expect(r.get("b")).toBe(-500);
  });

  it("複数回ぶんを足す", () => {
    const r = settledAmounts([
      { fromUserId: "b", toUserId: "a", amount: 500 },
      { fromUserId: "b", toUserId: "a", amount: 300 },
    ]);
    expect(r.get("a")).toBe(800);
    expect(r.get("b")).toBe(-800);
  });

  it("退会して相手が消えていても残りは数える", () => {
    const r = settledAmounts([{ fromUserId: null, toUserId: "a", amount: 500 }]);
    expect(r.get("a")).toBe(500);
    expect(r.size).toBe(1);
  });
});
