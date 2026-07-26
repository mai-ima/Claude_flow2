import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const create = vi.fn();
const update = vi.fn();

vi.mock("./db", () => ({
  db: {
    user: {
      get findUnique() {
        return findUnique;
      },
      get create() {
        return create;
      },
      get update() {
        return update;
      },
    },
    ledger: { findFirst: async () => ({ id: "L1" }), create: async () => ({ id: "L1" }) },
    category: { createMany: async () => ({}) },
    billingProfile: { upsert: async () => ({}) },
    session: { deleteMany: async () => ({}), create: async () => ({}) },
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: () => {}, get: () => undefined, delete: () => {} }),
}));

const { signInWithEmail } = await import("./auth");
const { hashPassword } = await import("./password");

beforeEach(() => {
  findUnique.mockReset();
  create.mockReset();
  update.mockReset();
});

describe("signInWithEmail (login)", () => {
  it("パスワード未設定のアカウントには任意のパスワードでログインできない", async () => {
    findUnique.mockResolvedValue({ id: "U1", name: "x", passwordHash: null });
    await expect(signInWithEmail("a@example.com", "anything123")).rejects.toThrow(
      "PASSWORD_NOT_SET",
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("パスワード不一致は INVALID_PASSWORD", async () => {
    findUnique.mockResolvedValue({ id: "U1", name: "x", passwordHash: hashPassword("correct1") });
    await expect(signInWithEmail("a@example.com", "wrongpass")).rejects.toThrow(
      "INVALID_PASSWORD",
    );
  });

  it("未登録は NO_ACCOUNT", async () => {
    findUnique.mockResolvedValue(null);
    await expect(signInWithEmail("a@example.com", "password1")).rejects.toThrow("NO_ACCOUNT");
  });

  it("8文字未満は WEAK_PASSWORD", async () => {
    await expect(signInWithEmail("a@example.com", "short")).rejects.toThrow("WEAK_PASSWORD");
  });

  it("正しいパスワードなら通る", async () => {
    findUnique.mockResolvedValue({ id: "U1", name: "x", passwordHash: hashPassword("correct1") });
    await expect(signInWithEmail("a@example.com", "correct1")).resolves.toBeTruthy();
  });
});

describe("signInWithEmail (signup)", () => {
  it("既存メールは EMAIL_TAKEN", async () => {
    findUnique.mockResolvedValue({ id: "U1" });
    await expect(
      signInWithEmail("a@example.com", "password1", { mode: "signup" }),
    ).rejects.toThrow("EMAIL_TAKEN");
  });
});
