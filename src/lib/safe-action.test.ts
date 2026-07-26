import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const requireUser = vi.fn();
const loggerError = vi.fn();

vi.mock("./auth", () => ({
  get requireUser() {
    return requireUser;
  },
}));
vi.mock("./logger", () => ({
  logger: {
    get error() {
      return loggerError;
    },
    info: () => {},
  },
}));

const { authedAction } = await import("./safe-action");

const USER = { id: "U1" };

beforeEach(() => {
  requireUser.mockReset();
  loggerError.mockReset();
  requireUser.mockResolvedValue(USER);
});

describe("authedAction", () => {
  const action = authedAction(z.object({ amount: z.number().int().min(1) }), async (input) => ({
    doubled: input.amount * 2,
  }));

  it("未ログインは実行されない", async () => {
    requireUser.mockRejectedValue(new Error("UNAUTHORIZED"));
    const res = await action({ amount: 5 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("ログイン");
  });

  it("入力が不正なら fieldErrors を返す", async () => {
    const res = await action({ amount: 0 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.amount).toBeTruthy();
  });

  it("正常時は data を返す", async () => {
    const res = await action({ amount: 5 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.doubled).toBe(10);
  });

  it("既知のドメインエラーは日本語に変換し、Sentry へ流さない", async () => {
    const failing = authedAction(z.object({}), async () => {
      throw new Error("FORBIDDEN");
    });
    const res = await failing({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("この操作を行う権限がありません。");
    expect(loggerError).not.toHaveBeenCalled();
  });

  it("未知の例外は握り潰さずログに出す", async () => {
    const failing = authedAction(z.object({}), async () => {
      throw new Error("something unexpected");
    });
    const res = await failing({});
    expect(res.ok).toBe(false);
    expect(loggerError).toHaveBeenCalled();
  });
});
