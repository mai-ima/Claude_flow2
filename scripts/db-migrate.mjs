// Vercel/本番デプロイ用のマイグレーション適用スクリプト。
// 通常は `prisma migrate deploy`。ただし以前 `db push` で作成した
// マイグレーション履歴の無い既存DB（P3005）では、既存マイグレーションを
// 「適用済み」としてベースライン化してから deploy する（データ保持・無停止）。
import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", ...opts });
}

try {
  const out = sh("npx prisma migrate deploy", { stdio: ["inherit", "pipe", "pipe"] });
  process.stdout.write(out);
} catch (e) {
  const msg = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  process.stdout.write(msg);
  if (msg.includes("P3005")) {
    console.log("[db-migrate] 既存DBを検出。マイグレーションをベースライン化します…");
    const dirs = readdirSync("prisma/migrations")
      .filter((d) => /^\d/.test(d))
      .sort();
    for (const d of dirs) {
      console.log(`[db-migrate] resolve --applied ${d}`);
      execSync(`npx prisma migrate resolve --applied ${d}`, { stdio: "inherit" });
    }
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
  } else {
    throw e;
  }
}
