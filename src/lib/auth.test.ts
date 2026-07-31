import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const create = vi.fn();
const update = vi.fn();
const sessionDeleteMany = vi.fn(async () => ({ count: 0 }));

/** cookies().get が返すセッショントークン。テストごとに差し替える。 */
let currentToken: string | undefined;

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
    session: {
      get deleteMany() {
        return sessionDeleteMany;
      },
      create: async () => ({}),
    },
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: () => {},
    get: (name: string) =>
      name === "tsumiki_session" && currentToken ? { value: currentToken } : undefined,
    delete: () => {},
  }),
  // セッション作成時に IP と User-Agent を控えるため headers() も呼ばれる。
  headers: async () => new Headers(),
}));

const { signInWithEmail, changePassword, revokeOtherSessions } = await import("./auth");
const { hashPassword } = await import("./password");

beforeEach(() => {
  findUnique.mockReset();
  create.mockReset();
  update.mockReset();
  sessionDeleteMany.mockClear();
  currentToken = undefined;
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

describe("changePassword", () => {
  it("現在のパスワードが違えば変更しない", async () => {
    findUnique.mockResolvedValue({ id: "U1", passwordHash: hashPassword("correct1") });
    await expect(changePassword("U1", "wrongpass", "brandnew1")).rejects.toThrow(
      "INVALID_PASSWORD",
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("同じパスワードへの変更は拒否する", async () => {
    findUnique.mockResolvedValue({ id: "U1", passwordHash: hashPassword("correct1") });
    await expect(changePassword("U1", "correct1", "correct1")).rejects.toThrow("SAME_PASSWORD");
    expect(update).not.toHaveBeenCalled();
  });

  it("8文字未満は保存前に弾く", async () => {
    await expect(changePassword("U1", "correct1", "short")).rejects.toThrow("WEAK_PASSWORD");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("成功すると今の端末以外のセッションを消す", async () => {
    currentToken = "tok-current";
    findUnique.mockResolvedValue({ id: "U1", passwordHash: hashPassword("correct1") });
    await changePassword("U1", "correct1", "brandnew1");

    expect(update).toHaveBeenCalledOnce();
    // 保存されるのはハッシュであって、生のパスワードではない。
    const saved = update.mock.calls[0][0].data.passwordHash as string;
    expect(saved).not.toContain("brandnew1");

    expect(sessionDeleteMany).toHaveBeenCalledWith({
      where: { userId: "U1", NOT: { sessionToken: "tok-current" } },
    });
  });

  it("Cookie が無いときは全セッションを消す", async () => {
    currentToken = undefined;
    findUnique.mockResolvedValue({ id: "U1", passwordHash: hashPassword("correct1") });
    await changePassword("U1", "correct1", "brandnew1");
    expect(sessionDeleteMany).toHaveBeenCalledWith({ where: { userId: "U1" } });
  });
});

describe("revokeOtherSessions", () => {
  it("今の端末は残す", async () => {
    currentToken = "tok-current";
    sessionDeleteMany.mockResolvedValueOnce({ count: 3 });
    await expect(revokeOtherSessions("U1")).resolves.toBe(3);
    expect(sessionDeleteMany).toHaveBeenCalledWith({
      where: { userId: "U1", NOT: { sessionToken: "tok-current" } },
    });
  });
});
