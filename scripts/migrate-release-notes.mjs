// changelog/page.tsx にハードコードされているリリースノートを ReleaseNote へ移す。
// 一度だけ実行する想定。既に同じ version があれば上書きしない（べき等）。
//
// TSX から配列を読むために、esbuild などを持ち込まず正規表現で切り出す。
// 移行後は page.tsx 側の RELEASES を消すため、この読み取りは使い捨てでよい。
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/index.js";

const db = new PrismaClient();
const src = readFileSync("src/app/(marketing)/changelog/page.tsx", "utf8");

const start = src.indexOf("const RELEASES = [");
const end = src.indexOf("\n];", start);
if (start < 0 || end < 0) {
  console.error("RELEASES 配列が見つかりません。既に移行済みかもしれません。");
  process.exit(1);
}
const literal = src.slice(start + "const RELEASES = ".length, end + 2);

// TSX の配列リテラルをそのまま評価する（信頼できる自前のソースのみ）。
const releases = new Function(`return ${literal}`)();
console.log("読み取り:", releases.length, "件");

// 「ベータ v1.2.7.0」→ "1.2.7.0" と リリース年月
function parseVersion(v) {
  const m = v.match(/(\d+(?:\.\d+)+)/);
  return m ? m[1] : v;
}
function parseDate(d, index, total) {
  const m = d.match(/(\d{4})年(\d{1,2})月/);
  if (m) {
    // 同じ月に複数ある場合、新しいものほど後ろの日付になるよう並び順で散らす。
    const day = Math.max(1, 28 - index);
    return new Date(Number(m[1]), Number(m[2]) - 1, Math.min(day, 28));
  }
  return new Date(2026, 0, total - index);
}

let created = 0;
let skipped = 0;
for (const [i, r] of releases.entries()) {
  const version = parseVersion(r.version);
  const existing = await db.releaseNote.findUnique({ where: { version } });
  if (existing) {
    skipped++;
    continue;
  }
  await db.releaseNote.create({
    data: {
      version,
      title: r.version,
      releasedAt: parseDate(r.date, i, releases.length),
      sections: r.sections ?? [],
      published: true,
    },
  });
  created++;
}

console.log(`作成 ${created} 件 / 既存 ${skipped} 件`);
const total = await db.releaseNote.count();
console.log("ReleaseNote 合計:", total);
await db.$disconnect();
