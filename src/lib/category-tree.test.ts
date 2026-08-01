import { describe, expect, it } from "vitest";
import { canSetParent, rollUp, type CategoryNode } from "./category-tree";

const cats: CategoryNode[] = [
  { id: "food", name: "食費", parentId: null },
  { id: "eatout", name: "外食", parentId: "food" },
  { id: "grocery", name: "食材", parentId: "food" },
  { id: "home", name: "住居", parentId: null },
];

describe("canSetParent", () => {
  it("親を外すのはいつでもできる", () => {
    expect(canSetParent(cats, "eatout", null)).toEqual({ ok: true });
  });

  it("親を持たないカテゴリの下には入れられる", () => {
    expect(canSetParent(cats, "home", "food")).toEqual({ ok: true });
  });

  it("自分自身は親にできない", () => {
    const r = canSetParent(cats, "food", "food");
    expect(r.ok).toBe(false);
  });

  it("サブカテゴリの下にはさらに追加できない", () => {
    const r = canSetParent(cats, "home", "eatout");
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.reason).toContain("サブカテゴリの下");
  });

  it("子を持つカテゴリは他の下に移せない", () => {
    const r = canSetParent(cats, "food", "home");
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.reason).toContain("サブカテゴリがある");
  });

  it("存在しない親は指定できない", () => {
    expect(canSetParent(cats, "home", "nope")).toMatchObject({ ok: false });
  });
});

describe("rollUp", () => {
  const amounts: Record<string, number> = {
    food: 1000,
    eatout: 3000,
    grocery: 2000,
    home: 85000,
  };
  const amountOf = (id: string) => amounts[id] ?? 0;

  it("子の額が親に足される", () => {
    const rows = rollUp(cats, amountOf);
    const food = rows.find((r) => r.category.id === "food");
    expect(food?.total).toBe(6000); // 1000 + 3000 + 2000
  });

  it("内訳が残る", () => {
    const rows = rollUp(cats, amountOf);
    const food = rows.find((r) => r.category.id === "food");
    expect(food?.children.map((c) => c.category.id)).toEqual(["eatout", "grocery"]);
  });

  it("内訳は金額の大きい順", () => {
    const rows = rollUp(cats, amountOf);
    const food = rows.find((r) => r.category.id === "food");
    expect(food?.children[0].category.id).toBe("eatout");
  });

  it("親は合計の大きい順に並ぶ", () => {
    const rows = rollUp(cats, amountOf);
    expect(rows.map((r) => r.category.id)).toEqual(["home", "food"]);
  });

  it("金額が無いものは出さない", () => {
    const rows = rollUp(cats, () => 0);
    expect(rows).toEqual([]);
  });

  it("金額 0 の子は内訳に出さない", () => {
    const rows = rollUp(cats, (id) => (id === "eatout" ? 500 : 0));
    const food = rows.find((r) => r.category.id === "food");
    expect(food?.children).toHaveLength(1);
    expect(food?.total).toBe(500);
  });

  it("子のいない親はそのまま出る", () => {
    const rows = rollUp(cats, (id) => (id === "home" ? 100 : 0));
    expect(rows).toHaveLength(1);
    expect(rows[0].category.id).toBe("home");
    expect(rows[0].children).toEqual([]);
  });
});
