import { describe, it, expect, vi, beforeEach } from "vitest";

const findUniqueMember = vi.fn();
const findUniqueCategory = vi.fn();
const findUniquePaymentMethod = vi.fn();

vi.mock("./db", () => ({
  db: {
    ledgerMember: {
      get findUnique() {
        return findUniqueMember;
      },
    },
    category: {
      get findUnique() {
        return findUniqueCategory;
      },
    },
    paymentMethod: {
      get findUnique() {
        return findUniquePaymentMethod;
      },
    },
  },
}));

vi.mock("next/headers", () => ({ cookies: async () => new Map() }));

const { requireLedgerMember, assertLedgerOwnedRefs } = await import("./ledger-access");

beforeEach(() => {
  findUniqueMember.mockReset();
  findUniqueCategory.mockReset();
  findUniquePaymentMethod.mockReset();
});

describe("requireLedgerMember", () => {
  it("非メンバーは FORBIDDEN", async () => {
    findUniqueMember.mockResolvedValue(null);
    await expect(requireLedgerMember("L1", "U1")).rejects.toThrow("FORBIDDEN");
  });

  it("VIEWER は EDITOR 権限を満たさない", async () => {
    findUniqueMember.mockResolvedValue({ role: "VIEWER" });
    await expect(requireLedgerMember("L1", "U1", "EDITOR")).rejects.toThrow("FORBIDDEN");
  });

  it("EDITOR は EDITOR を満たす", async () => {
    findUniqueMember.mockResolvedValue({ role: "EDITOR" });
    await expect(requireLedgerMember("L1", "U1", "EDITOR")).resolves.toBeTruthy();
  });

  it("EDITOR は OWNER を満たさない", async () => {
    findUniqueMember.mockResolvedValue({ role: "EDITOR" });
    await expect(requireLedgerMember("L1", "U1", "OWNER")).rejects.toThrow("FORBIDDEN");
  });

  it("OWNER は全ての権限を満たす", async () => {
    findUniqueMember.mockResolvedValue({ role: "OWNER" });
    await expect(requireLedgerMember("L1", "U1", "OWNER")).resolves.toBeTruthy();
    await expect(requireLedgerMember("L1", "U1", "VIEWER")).resolves.toBeTruthy();
  });
});

describe("assertLedgerOwnedRefs", () => {
  it("未指定は素通し", async () => {
    await expect(assertLedgerOwnedRefs("L1", {})).resolves.toBeUndefined();
    expect(findUniqueCategory).not.toHaveBeenCalled();
  });

  it("同じ帳簿のカテゴリは通る", async () => {
    findUniqueCategory.mockResolvedValue({ ledgerId: "L1" });
    await expect(assertLedgerOwnedRefs("L1", { categoryId: "C1" })).resolves.toBeUndefined();
  });

  it("他帳簿のカテゴリは FORBIDDEN", async () => {
    findUniqueCategory.mockResolvedValue({ ledgerId: "OTHER" });
    await expect(assertLedgerOwnedRefs("L1", { categoryId: "C1" })).rejects.toThrow("FORBIDDEN");
  });

  it("存在しないカテゴリは FORBIDDEN", async () => {
    findUniqueCategory.mockResolvedValue(null);
    await expect(assertLedgerOwnedRefs("L1", { categoryId: "C1" })).rejects.toThrow("FORBIDDEN");
  });

  it("他帳簿の支払い方法は FORBIDDEN", async () => {
    findUniquePaymentMethod.mockResolvedValue({ ledgerId: "OTHER" });
    await expect(assertLedgerOwnedRefs("L1", { paymentMethodId: "P1" })).rejects.toThrow(
      "FORBIDDEN",
    );
  });
});
