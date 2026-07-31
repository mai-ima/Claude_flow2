import { describe, it, expect, vi, beforeEach } from "vitest";

/** 発行されたトークン行を覚えておく最小のスタブ。 */
let rows: { identifier: string; token: string; expires: Date }[] = [];

vi.mock("./db", () => ({
  db: {
    verificationToken: {
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const before = rows.length;
        if (typeof where.identifier === "string") {
          rows = rows.filter((r) => r.identifier !== where.identifier);
        } else if (typeof where.token === "string") {
          rows = rows.filter((r) => r.token !== where.token);
        } else if (where.expires) {
          const lt = (where.expires as { lt: Date }).lt;
          rows = rows.filter((r) => r.expires >= lt);
        }
        return { count: before - rows.length };
      },
      create: async ({ data }: { data: (typeof rows)[number] }) => {
        rows.push(data);
        return data;
      },
      findUnique: async ({ where }: { where: { token: string } }) =>
        rows.find((r) => r.token === where.token) ?? null,
    },
  },
}));

const { issueToken, consumeToken, purgeExpiredTokens } = await import("./verification-token");

beforeEach(() => {
  rows = [];
});

describe("issueToken", () => {
  it("生のトークンはそのまま保存されない", async () => {
    const raw = await issueToken("reset", "a@example.com");
    expect(rows).toHaveLength(1);
    expect(rows[0].token).not.toBe(raw);
    expect(rows[0].token).toHaveLength(64); // sha256 の16進表現
  });

  it("再発行すると前のトークンは消える", async () => {
    const first = await issueToken("reset", "a@example.com");
    await issueToken("reset", "a@example.com");
    expect(rows).toHaveLength(1);
    await expect(consumeToken("reset", first)).resolves.toBeNull();
  });

  it("用途が違えば併存する", async () => {
    await issueToken("reset", "a@example.com");
    await issueToken("verify", "a@example.com");
    expect(rows).toHaveLength(2);
  });
});

describe("consumeToken", () => {
  it("正しいトークンから宛先を取り出せる", async () => {
    const raw = await issueToken("reset", "A@Example.com");
    await expect(consumeToken("reset", raw)).resolves.toBe("a@example.com");
  });

  it("一度使うと二度目は通らない", async () => {
    const raw = await issueToken("reset", "a@example.com");
    await consumeToken("reset", raw);
    await expect(consumeToken("reset", raw)).resolves.toBeNull();
  });

  it("確認用トークンでパスワード再設定はできない", async () => {
    const raw = await issueToken("verify", "a@example.com");
    await expect(consumeToken("reset", raw)).resolves.toBeNull();
  });

  it("期限切れは通らない", async () => {
    const raw = await issueToken("reset", "a@example.com");
    rows[0].expires = new Date(Date.now() - 1000);
    await expect(consumeToken("reset", raw)).resolves.toBeNull();
  });

  it("期限切れのトークンは記録ごと消える", async () => {
    const raw = await issueToken("reset", "a@example.com");
    rows[0].expires = new Date(Date.now() - 1000);
    await consumeToken("reset", raw);
    expect(rows).toHaveLength(0);
  });

  it("知らないトークンは通らない", async () => {
    await expect(consumeToken("reset", "でたらめ")).resolves.toBeNull();
    await expect(consumeToken("reset", "")).resolves.toBeNull();
  });
});

describe("purgeExpiredTokens", () => {
  it("期限切れだけ消す", async () => {
    await issueToken("reset", "live@example.com");
    await issueToken("verify", "dead@example.com");
    rows[1].expires = new Date(Date.now() - 1000);
    await expect(purgeExpiredTokens()).resolves.toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].identifier).toBe("reset:live@example.com");
  });
});
