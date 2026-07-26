// Vercelデプロイ用のビルド手順。
// データベース(DATABASE_URL)が未設定でもビルド自体は成功させ、マーケティングページ等の
// 公開を先に進められるようにする。ログイン・家計簿機能はDB接続後に有効になる。
import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

run("npx prisma generate");

// Vercel Postgres/Neon等の統合は、DATABASE_URLではなく別名(POSTGRES_URL等)で
// 接続文字列を発行することがあるため、代表的な候補から補完する。
const FALLBACK_KEYS = [
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
];
const dbUrl = process.env.DATABASE_URL ?? FALLBACK_KEYS.map((k) => process.env[k]).find(Boolean);

if (dbUrl) {
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = dbUrl;
  // スキーマの反映は db push に一本化している。
  // migrations ディレクトリは現行スキーマから乖離したまま誰も実行しておらず、
  // 残しておくと migrate deploy を実行したときに誤ったスキーマになるため削除した。
  run("npx prisma db push --accept-data-loss");
  run("node scripts/seed.mjs");
} else {
  console.warn(
    "[vercel-build] DATABASE_URL が未設定のため、データベースの同期とデータ投入をスキップします。\n" +
      "  マーケティングページ等は公開されますが、ログイン・家計簿機能はデータベース接続後に有効になります。\n" +
      "  Vercel の Storage タブから Postgres を追加すると、次回のデプロイから自動的に有効になります。",
  );
}

run("npx next build");
