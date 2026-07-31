import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl, FALLBACK_DATABASE_URL_KEYS } from "./database-url";

describe("resolveDatabaseUrl", () => {
  it("DATABASE_URL が最優先", () => {
    expect(
      resolveDatabaseUrl({ DATABASE_URL: "postgres://a", POSTGRES_URL: "postgres://b" }),
    ).toEqual({ url: "postgres://a", source: "DATABASE_URL" });
  });

  it("DATABASE_URL が無ければ別名から採る", () => {
    expect(resolveDatabaseUrl({ POSTGRES_PRISMA_URL: "postgres://b" })).toEqual({
      url: "postgres://b",
      source: "POSTGRES_PRISMA_URL",
    });
  });

  it("別名同士の優先順位を守る", () => {
    expect(
      resolveDatabaseUrl({ POSTGRES_URL: "postgres://c", POSTGRES_PRISMA_URL: "postgres://b" }),
    ).toEqual({ url: "postgres://b", source: "POSTGRES_PRISMA_URL" });
  });

  it("空文字は未設定として扱う", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "", POSTGRES_URL: "postgres://c" })).toEqual({
      url: "postgres://c",
      source: "POSTGRES_URL",
    });
  });

  it("どれも無ければ未解決", () => {
    expect(resolveDatabaseUrl({})).toEqual({ url: undefined, source: null });
  });

  it("デプロイ用スクリプトと候補一覧が一致する", () => {
    // ビルド時と実行時で見る変数がずれると、
    // 「ビルドは通るのに公開後だけ繋がらない」が再発する。
    const script = readFileSync(
      path.join(process.cwd(), "scripts", "vercel-build.mjs"),
      "utf8",
    );
    for (const key of FALLBACK_DATABASE_URL_KEYS) {
      expect(script, `${key} が vercel-build.mjs にない`).toContain(key);
    }
  });
});
