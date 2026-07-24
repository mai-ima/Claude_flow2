// Vercelのデプロイで DATABASE_URL が未設定のまま失敗するのを防ぐ。
// Vercel Postgres/Neon 等の統合は、DATABASE_URL ではなく POSTGRES_PRISMA_URL /
// POSTGRES_URL といった名前で接続文字列を発行することがある。
// それらのいずれかが存在すれば .env に DATABASE_URL として書き出し、
// 後続の prisma / next のコマンドから拾えるようにする。
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const FALLBACK_KEYS = [
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
];

if (!process.env.DATABASE_URL) {
  const foundKey = FALLBACK_KEYS.find((k) => process.env[k]);

  if (foundKey) {
    const value = process.env[foundKey];
    const line = `DATABASE_URL="${value}"\n`;
    const existing = existsSync(".env") ? readFileSync(".env", "utf8") : "";
    if (!existing.includes("DATABASE_URL=")) {
      appendFileSync(".env", line);
    }
    console.log(
      `[resolve-db-url] DATABASE_URL が未設定のため ${foundKey} から補完しました。`,
    );
  } else {
    console.error(
      "[resolve-db-url] DATABASE_URL が設定されていません。\n" +
        `  次のいずれの環境変数も見つかりませんでした: DATABASE_URL, ${FALLBACK_KEYS.join(", ")}\n` +
        "  Vercel の Settings > Environment Variables で、接続先データベースの URL を\n" +
        "  DATABASE_URL という名前で設定してください（Storage タブから Postgres を追加すると自動設定されます）。",
    );
    process.exit(1);
  }
}
