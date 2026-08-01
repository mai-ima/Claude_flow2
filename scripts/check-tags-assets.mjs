// タグ・資産スナップショット・添付を実データで確かめる。
// 見ているのは「他の帳簿のものを混ぜられないか」と「消したときに何が残るか」。
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("../src/generated/prisma/index.js");
const db = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/tsumiki" },
  },
});

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
};

const tag = "tga-" + Date.now().toString().slice(-6);
const user = await db.user.create({
  data: { email: `${tag}@t.test`, name: "利用者", emailVerified: new Date() },
});
const ledger = await db.ledger.create({
  data: {
    name: `${tag} 帳簿`,
    type: "PERSONAL",
    ownerId: user.id,
    members: { create: { userId: user.id, role: "OWNER" } },
  },
});
const other = await db.ledger.create({
  data: {
    name: `${tag} 別帳簿`,
    type: "PERSONAL",
    ownerId: user.id,
    members: { create: { userId: user.id, role: "OWNER" } },
  },
});

// ── タグ ───────────────────────────────────────────
const trip = await db.tag.create({
  data: { ledgerId: ledger.id, name: "旅行2026", color: "blue" },
});
check("タグを作れる", trip.name === "旅行2026");

let dup = null;
try {
  await db.tag.create({ data: { ledgerId: ledger.id, name: "旅行2026" } });
} catch (e) {
  dup = e.code;
}
check("同じ帳簿に同じ名前は作れない", dup === "P2002", String(dup));

// 別の帳簿なら同じ名前でよい（他人の家計に干渉しない）。
const sameName = await db.tag.create({ data: { ledgerId: other.id, name: "旅行2026" } });
check("別の帳簿なら同じ名前を使える", sameName.id !== trip.id);

const txn = await db.transaction.create({
  data: {
    ledgerId: ledger.id,
    createdByUserId: user.id,
    type: "EXPENSE",
    amount: 12000,
    occurredAt: new Date(),
  },
});
await db.transactionTag.create({ data: { transactionId: txn.id, tagId: trip.id } });

// 他の帳簿のタグを貼らせない（actions.ts と同じ判定を再現）。
async function trySet(transactionId, tagIds) {
  const owned = await db.tag.count({ where: { ledgerId: ledger.id, id: { in: tagIds } } });
  if (owned !== new Set(tagIds).size) return "FORBIDDEN";
  return "OK";
}
check("他の帳簿のタグは貼れない", (await trySet(txn.id, [sameName.id])) === "FORBIDDEN");
check("自分の帳簿のタグは貼れる", (await trySet(txn.id, [trip.id])) === "OK");

// タグで絞り込める
const tagged = await db.transaction.count({
  where: { ledgerId: ledger.id, tags: { some: { tagId: trip.id } } },
});
check("タグで絞り込める", tagged === 1, `${tagged}件`);

// タグを消しても取引は残る
await db.tag.delete({ where: { id: trip.id } });
check("タグを消しても取引は残る", (await db.transaction.count({ where: { id: txn.id } })) === 1);
check(
  "貼り付けの行だけ消える",
  (await db.transactionTag.count({ where: { transactionId: txn.id } })) === 0,
);

// ── 資産スナップショット ───────────────────────────
const m = (y, mo) => new Date(y, mo - 1, 1);
await db.assetSnapshot.create({ data: { ledgerId: ledger.id, month: m(2026, 6), amount: 1200000 } });
await db.assetSnapshot.create({ data: { ledgerId: ledger.id, month: m(2026, 7), amount: 1250000 } });

// 同じ月は上書き（upsert と同じ振る舞い）
await db.assetSnapshot.upsert({
  where: { ledgerId_month: { ledgerId: ledger.id, month: m(2026, 7) } },
  create: { ledgerId: ledger.id, month: m(2026, 7), amount: 999 },
  update: { amount: 1300000 },
});
const snaps = await db.assetSnapshot.findMany({
  where: { ledgerId: ledger.id },
  orderBy: { month: "asc" },
});
check("月ごとに1件へ畳まれる", snaps.length === 2, `${snaps.length}件`);
check("同じ月は上書きされる", snaps[1].amount === 1300000, `${snaps[1].amount}`);

// 前月との差（queries.ts と同じ数え方）
const diffs = snaps.map((r, i) => (i > 0 ? r.amount - snaps[i - 1].amount : null));
check("最初の月に増減は出ない", diffs[0] === null);
check("前月との差が出る", diffs[1] === 100000, `${diffs[1]}`);

// ── 添付 ───────────────────────────────────────────
const att = await db.attachment.create({
  data: {
    transactionId: txn.id,
    url: "https://example.invalid/x.jpg",
    pathname: "ledgers/x/y.jpg",
    name: "レシート.jpg",
    mimeType: "image/jpeg",
    size: 123456,
  },
});
check("添付を記録できる", att.mimeType === "image/jpeg");
await db.transaction.delete({ where: { id: txn.id } });
check(
  "取引を消すと添付の行も消える",
  (await db.attachment.count({ where: { id: att.id } })) === 0,
);

// ── 帳簿を消したとき ───────────────────────────────
await db.ledger.deleteMany({ where: { id: { in: [ledger.id, other.id] } } });
check("帳簿を消すとタグも残らない", (await db.tag.count({ where: { ledgerId: ledger.id } })) === 0);
check(
  "帳簿を消すと資産の記録も残らない",
  (await db.assetSnapshot.count({ where: { ledgerId: ledger.id } })) === 0,
);

await db.user.delete({ where: { id: user.id } });
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
