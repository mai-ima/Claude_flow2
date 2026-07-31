import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXPECTED_MIGRATIONS } from "./expected-migrations";

describe("EXPECTED_MIGRATIONS", () => {
  it("prisma/migrations の中身と一致する", () => {
    // 一覧を手で書く以上、書き忘れが起きる。ここで実フォルダと突き合わせて
    // 「マイグレーションを足したのに /api/health が古いまま」を防ぐ。
    const dir = path.join(process.cwd(), "prisma", "migrations");
    const actual = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();

    expect([...EXPECTED_MIGRATIONS].sort()).toEqual(actual);
  });

  it("0_init が先頭にある", () => {
    expect(EXPECTED_MIGRATIONS[0]).toBe("0_init");
  });
});
