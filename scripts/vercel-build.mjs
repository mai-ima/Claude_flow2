// Vercelデプロイ用のビルド手順。
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

function die(message) {
  console.error(`\n[vercel-build] ${message}\n`);
  process.exit(1);
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
} else if (process.env.ALLOW_BUILD_WITHOUT_DB === "1") {
  // データベース接続前の「マーケティングページだけ先に公開する」段階。
  // アプリ側（ログイン・家計簿）は動かないことを承知のうえでビルドする。
  console.warn(
    "[vercel-build] ALLOW_BUILD_WITHOUT_DB=1 のため、データベースの同期を省略します。\n" +
      "  ログイン・家計簿はデータベースを接続するまで動作しません。",
  );
} else {
  // ここで止めるのは、黙って進むと「新しいコード × 古いデータベース」が
  // そのまま公開され、ログインなどが 500 になるため。
  // ビルドを失敗させれば、直前の正常なデプロイが残る。
  die(
    "DATABASE_URL が見つからないため、データベースの更新を実行できません。\n" +
      "  このまま公開すると、コードが必要とする列がデータベースに無い状態になり、\n" +
      "  ログインなどがサーバーエラーになります。\n\n" +
      "  対処:\n" +
      "  1. Vercel の Settings → Environment Variables で DATABASE_URL が\n" +
      "     「Production」だけでなく Build でも参照できるか確認してください。\n" +
      "     （Storage タブから接続した場合は自動で入ります）\n" +
      "  2. データベース接続前で、マーケティングページだけ公開したい場合は\n" +
      "     ALLOW_BUILD_WITHOUT_DB=1 を設定してください。",
  );
}

run("npx next build");
