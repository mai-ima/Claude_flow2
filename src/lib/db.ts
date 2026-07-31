import { PrismaClient } from "@/generated/prisma";
import { resolveDatabaseUrl } from "./database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function connectionUrl(): string | undefined {
  // DATABASE_URL に限らない。Vercel の Postgres 連携は POSTGRES_PRISMA_URL 等の
  // 別名で発行するため、そちらも見る（見ないと本番だけ繋がらない）。
  const raw = resolveDatabaseUrl().url;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "5");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "15");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * 接続文字列がどこにも無いときの置き場所。
 *
 * 何も渡さないと PrismaClient は「環境変数が見つからない」で生成そのものに
 * 失敗し、このモジュールを読み込む全ページが 500 になる。原因を表示する
 * 画面や /api/health まで巻き添えになるのが困る。
 * 明らかに繋がらない値を渡しておけば、失敗は「接続できない」という
 * 扱えるエラー(P1001)になり、どこが悪いかを画面から伝えられる。
 */
const UNCONFIGURED_URL = "postgresql://unconfigured:unconfigured@127.0.0.1:1/unconfigured";

const url = connectionUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: { db: { url: url ?? UNCONFIGURED_URL } },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
