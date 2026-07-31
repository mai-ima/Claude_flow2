// Vercelデプロイ用のビルド手順。
//
// 方針: データベースの準備に失敗しても、ビルドは止めない。
//
// 以前はここで process.exit(1) していた。狙いは「新しいコード × 古いデータベース」
// を公開しないことだったが、実際に起きたのは逆のことだった。接続文字列の名前が
// 食い違っているだけでビルドが毎回失敗し、Vercel は直前のデプロイを残すため、
// 壊れたままの画面が更新されずに固定されてしまった。修正を出しても本番に届かない。
//
// いまはアプリ側が落ちずに degrade する（ログイン画面は開き、/api/health が
// 原因を名指しする）ため、公開して自分で名乗らせるほうが復旧が早い。
// 準備に失敗したことは終了時にまとめて大きく出す。
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";

// Vercel では環境変数がプロセスに入っているが、ローカルでは .env にある。
// 読み込まないと、手元のビルドだけ「DATABASE_URL が無い」経路に落ちて
// 本番と挙動が変わる。override:false で実環境変数を優先する。
loadEnv({ override: false });

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

/** 公開はするが、放置してはいけない問題。最後にまとめて出す。 */
const warnings = [];

run("npx prisma generate");

// Vercel Postgres/Neon等の統合は、DATABASE_URLではなく別名(POSTGRES_URL等)で
// 接続文字列を発行することがあるため、代表的な候補から補完する。
// この一覧は src/lib/database-url.ts と一致させること
// （database-url.test.ts が突き合わせて検査する）。
const FALLBACK_KEYS = [
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  // Neon / Supabase 連携が発行する名前。
  "POSTGRES_URL_NO_SSL",
  "NEON_DATABASE_URL",
  "SUPABASE_DB_URL",
];

/** 接続文字列と、その出どころの変数名。 */
function resolveDbUrl() {
  if (process.env.DATABASE_URL) {
    return { url: process.env.DATABASE_URL, source: "DATABASE_URL" };
  }
  for (const key of FALLBACK_KEYS) {
    if (process.env[key]) return { url: process.env[key], source: key };
  }
  return { url: undefined, source: null };
}

const { url: dbUrl, source } = resolveDbUrl();

if (dbUrl) {
  // 以降の prisma コマンドは DATABASE_URL しか見ないため、別名から採った場合はここで揃える。
  process.env.DATABASE_URL = dbUrl;
  // どの変数から採ったかを出す。取り違えの調査に効く（値は出さない）。
  console.log(`[vercel-build] データベース接続文字列: ${source} を使用します。`);

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
    tryRun("npx prisma migrate resolve --applied 0_init");
    if (!tryRun("npx prisma migrate deploy")) {
      warnings.push(
        "データベースのマイグレーションに失敗しました。\n" +
          "  公開は続行しますが、データベースがコードより古いままです。\n" +
          "  /api/health の schema.missing に不足している内容が出ます。",
      );
    }
  }

  // 投入に失敗しても公開は続ける（seed.mjs 自身も exit 0 で返す作り）。
  tryRun("node scripts/seed.mjs");
} else {
  warnings.push(
    "データベースの接続文字列が見つかりませんでした。\n" +
      `  探した変数: DATABASE_URL, ${FALLBACK_KEYS.join(", ")}\n` +
      "  マーケティングページは公開されますが、ログインと家計簿は動きません。\n\n" +
      "  対処: Vercel の Settings → Environment Variables で、上のいずれかが\n" +
      "  Production に設定されているか確認してください。\n" +
      "  （Storage タブからデータベースを接続すると自動で入ります）",
  );
}

run("npx next build");

/**
 * サーバー関数に「起動に必要なもの」が入っているかを、公開前に確かめる。
 *
 * outputFileTracingExcludes を書き間違えると、関数はリクエストを受ける前に
 * Cannot find module で落ちる。手元の next start は node_modules が丸ごと
 * あるため再現せず、公開して初めて分かる。ビルド成果物のほうを直接見る。
 */
function checkTracedRuntimeDeps() {
  const REQUIRED = ["@swc/helpers", "next/dist"];
  const roots = ["app", "pages"];
  const traces = [];

  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".nft.json")) traces.push(full);
    }
  };
  for (const r of roots) walk(join(".next", "server", r));
  if (traces.length === 0) return;

  const missing = new Set();
  for (const t of traces) {
    let files;
    try {
      files = JSON.parse(readFileSync(t, "utf8")).files ?? [];
    } catch {
      continue;
    }
    for (const pkg of REQUIRED) {
      if (!files.some((f) => f.includes(pkg))) missing.add(`${pkg} (${t})`);
    }
  }

  if (missing.size > 0) {
    warnings.push(
      "サーバー関数の同梱物に、起動に必要なものが含まれていません:\n" +
        [...missing].map((m) => `    - ${m}`).join("\n") +
        "\n  next.config.ts の outputFileTracingExcludes を確認してください。\n" +
        "  このまま公開すると、動的なページが全て 500 になります。",
    );
  } else {
    console.log(`[vercel-build] サーバー関数の同梱物を確認しました（${traces.length}件）。`);
  }
}

checkTracedRuntimeDeps();

if (warnings.length > 0) {
  // ビルドは成功させるが、ログを流し読みしても気づける大きさで出す。
  console.warn(`\n${"=".repeat(72)}`);
  console.warn("[vercel-build] 公開しましたが、未解決の問題があります:");
  for (const w of warnings) console.warn(`\n- ${w}`);
  console.warn(`\n  確認: https://<あなたのドメイン>/api/health`);
  console.warn(`${"=".repeat(72)}\n`);
}
