// Vercelデプロイ用のビルド手順。
// データベース(DATABASE_URL)が未設定でもビルド自体は成功させ、マーケティングページ等の
// 公開を先に進められるようにする。ログイン・家計簿機能はDB接続後に有効になる。
import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function tryRun(cmd) {
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
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

  // スキーマの反映は migrate deploy に一本化する。
  // db push は差分を推測して実行するため、列の改名やNULL制約の変更が
  // 「削除して作り直し」に化けることがあり、本番データを失う。
  //
  // 既に db push で作られた本番DBには履歴テーブルが無く、そのままでは
  // 初回の migrate deploy が P3005 で止まる。その場合に限り、
  // ベースライン(0_init)を「適用済み」として記録してから再実行する。
  // 0_init は db push が作った現行スキーマと同じ内容なので、
  // 実行せずに記録するのが正しい。
  if (!tryRun("npx prisma migrate deploy")) {
    console.warn("[vercel-build] migrate deploy に失敗。ベースラインを記録して再試行します。");
    run("npx prisma migrate resolve --applied 0_init");
    run("npx prisma migrate deploy");
  }

  run("node scripts/seed.mjs");
} else {
  console.warn(
    "[vercel-build] DATABASE_URL が未設定のため、データベースの同期とデータ投入をスキップします。\n" +
      "  マーケティングページ等は公開されますが、ログイン・家計簿機能はデータベース接続後に有効になります。\n" +
      "  Vercel の Storage タブから Postgres を追加すると、次回のデプロイから自動的に有効になります。",
  );
}

run("npx next build");
