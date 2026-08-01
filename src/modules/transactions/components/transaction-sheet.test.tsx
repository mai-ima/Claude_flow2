import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TransactionSheet } from "./transaction-sheet";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../actions", () => ({ createTransaction: vi.fn(), updateTransaction: vi.fn() }));

const categories = [
  { id: "c1", name: "食費", type: "EXPENSE" },
  { id: "c2", name: "給与", type: "INCOME" },
];

afterEach(cleanup);

describe("TransactionSheet のカテゴリ選択", () => {
  it("一覧にある値はそのまま選択される", () => {
    render(
      <TransactionSheet
        open
        onClose={() => {}}
        categories={categories}
        paymentMethods={[]}
        initial={{
          id: "t1",
          type: "EXPENSE",
          amount: 1000,
          occurredAt: "2026-07-01",
          categoryId: "c1",
          categoryName: "食費",
          paymentMethodId: "",
          paidByUserId: "",
          tagIds: [],
          memo: "",
        }}
      />,
    );
    const select = screen.getByRole("combobox", { name: "カテゴリ" });
    expect((select as HTMLSelectElement).value).toBe("c1");
  });

  it("アーカイブ済みで一覧に無い値も選択肢として残り、未分類に落ちない", () => {
    render(
      <TransactionSheet
        open
        onClose={() => {}}
        categories={categories}
        paymentMethods={[]}
        initial={{
          id: "t2",
          type: "EXPENSE",
          amount: 1000,
          occurredAt: "2026-07-01",
          categoryId: "archived-1",
          categoryName: "旧・交際費",
          paymentMethodId: "",
          paidByUserId: "",
          tagIds: [],
          memo: "",
        }}
      />,
    );
    const select = screen.getByRole("combobox", { name: "カテゴリ" }) as HTMLSelectElement;
    expect(select.value).toBe("archived-1");
    expect(screen.getByRole("option", { name: "旧・交際費（アーカイブ済み）" })).toBeTruthy();
  });

  it("カテゴリ名が不明でも値は失われない", () => {
    render(
      <TransactionSheet
        open
        onClose={() => {}}
        categories={categories}
        paymentMethods={[]}
        initial={{
          id: "t3",
          type: "EXPENSE",
          amount: 1000,
          occurredAt: "2026-07-01",
          categoryId: "archived-2",
          paymentMethodId: "",
          paidByUserId: "",
          tagIds: [],
          memo: "",
        }}
      />,
    );
    const select = screen.getByRole("combobox", { name: "カテゴリ" }) as HTMLSelectElement;
    expect(select.value).toBe("archived-2");
    expect(screen.getByRole("option", { name: /アーカイブ済みのカテゴリ/ })).toBeTruthy();
  });
});
