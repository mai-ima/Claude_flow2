// 依存の脆弱性を見る。npm audit の結果を、確認済みの例外と突き合わせる。
//
// npm audit をそのまま CI に置くと、直しようのない指摘ひとつで永久に赤くなり、
// やがて誰も見なくなる。かといって外すと新しい指摘に気づけない。
// 「確認して受け入れたもの」だけを一覧にし、それ以外で落とす。
//
// 例外には見直し期限を持たせる。期限を過ぎたら失敗するので、
// 一度書いた例外がそのまま忘れ去られることがない。
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LEVELS = ["info", "low", "moderate", "high", "critical"];
const MIN_LEVEL = process.env.AUDIT_LEVEL ?? "high";

function audit() {
  try {
    // 指摘があると npm audit は非0で終わるため、出力だけ受け取る。
    return JSON.parse(execSync("npm audit --omit=dev --json", { encoding: "utf8" }));
  } catch (err) {
    if (err.stdout) return JSON.parse(err.stdout);
    throw err;
  }
}

const { exceptions = [] } = JSON.parse(readFileSync("security-exceptions.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);

const expired = exceptions.filter((e) => e.reviewBy && e.reviewBy < today);
const active = exceptions.filter((e) => !e.reviewBy || e.reviewBy >= today);

const report = audit();
const problems = [];

const vulns = report.vulnerabilities ?? {};

/**
 * この指摘が例外で説明できるか。
 *
 * via には勧告そのものと、「別のパッケージ経由で脆弱」を表す文字列が混ざる。
 * 例えば next は sharp に依存しているというだけで指摘に載る。
 * 伝播元をすべて辿り、そのどれもが例外に載っていれば説明がついたとみなす。
 */
function isCovered(name, seen = new Set()) {
  if (seen.has(name)) return true; // 循環はここで止める
  seen.add(name);

  if (active.some((e) => e.module === name)) return true;

  const v = vulns[name];
  if (!v) return false;

  const via = v.via ?? [];
  const advisoryIds = via
    .filter((x) => typeof x === "object")
    .map((a) => a.url?.split("/").pop())
    .filter(Boolean);
  if (advisoryIds.some((id) => active.some((e) => e.advisory === id))) return true;

  // 自前の勧告が残っているなら、それは伝播ではなく本体の問題。
  const ownAdvisories = via.filter((x) => typeof x === "object");
  const sources = via.filter((x) => typeof x === "string");
  if (ownAdvisories.length > 0) return false;
  if (sources.length === 0) return false;

  return sources.every((s) => isCovered(s, seen));
}

for (const [name, v] of Object.entries(vulns)) {
  if (LEVELS.indexOf(v.severity) < LEVELS.indexOf(MIN_LEVEL)) continue;
  if (isCovered(name)) continue;

  const titles = (v.via ?? [])
    .filter((x) => typeof x === "object")
    .map((a) => a.title)
    .join(" / ");
  problems.push(`${name} (${v.severity}): ${titles || "詳細は npm audit を参照"}`);
}

if (expired.length > 0) {
  console.error("\n以下の例外は見直し期限を過ぎています。内容を確認して更新してください:");
  for (const e of expired) console.error(`  - ${e.module} (${e.advisory}) 期限 ${e.reviewBy}`);
}

if (problems.length > 0) {
  console.error(`\n未確認の脆弱性が ${problems.length} 件あります (${MIN_LEVEL} 以上):`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    "\n対処: 依存を更新するか、届かない理由を security-exceptions.json に書いてください。\n",
  );
}

if (problems.length > 0 || expired.length > 0) process.exit(1);

console.log(
  `脆弱性の確認: 未対応の指摘はありません（${MIN_LEVEL} 以上、例外 ${active.length} 件）。`,
);
