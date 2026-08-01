// 保存した検索と初回案内を実データで確かめる。
// とくに「他の人の保存が見えない・消せない」ことを見る。
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

const tag = "sav-" + Date.now().toString().slice(-6);
const a = await db.user.create({
  data: { email: `${tag}-a@t.test`, name: "Aさん", emailVerified: new Date() },
});
const b = await db.user.create({
  data: { email: `${tag}-b@t.test`, name: "Bさん", emailVerified: new Date() },
});
const ledger = await db.ledger.create({
  data: {
    name: `${tag} 共有`,
    type: "POD",
    ownerId: a.id,
    members: { create: [{ userId: a.id, role: "OWNER" }, { userId: b.id, role: "EDITOR" }] },
  },
});

// ── 保存と一覧 ─────────────────────────────────────
await db.savedSearch.create({
  data: { ledgerId: ledger.id, userId: a.id, name: "今月の食費", query: "type=EXPENSE&q=食費" },
});
await db.savedSearch.create({
  data: { ledgerId: ledger.id, userId: b.id, name: "Bの検索", query: "type=INCOME" },
});

const mine = await db.savedSearch.findMany({ where: { ledgerId: ledger.id, userId: a.id } });
check("自分の保存だけが並ぶ", mine.length === 1 && mine[0].name === "今月の食費", `${mine.length}件`);
check("条件がそのまま残る", mine[0].query === "type=EXPENSE&q=食費");

// ── 同じ名前は上書き（actions.ts と同じ判定） ──────
async function save(userId, name, query) {
  const existing = await db.savedSearch.findFirst({ where: { ledgerId: ledger.id, userId, name } });
  if (existing) {
    await db.savedSearch.update({ where: { id: existing.id }, data: { query } });
    return "updated";
  }
  await db.savedSearch.create({ data: { ledgerId: ledger.id, userId, name, query } });
  return "created";
}
check("同じ名前は上書きされる", (await save(a.id, "今月の食費", "type=EXPENSE&cat=x")) === "updated");
check(
  "上書き後も1件のまま",
  (await db.savedSearch.count({ where: { ledgerId: ledger.id, userId: a.id } })) === 1,
);
check("別の名前なら増える", (await save(a.id, "収入だけ", "type=INCOME")) === "created");

// ── 他人の保存は消せない（actions.ts と同じ where） ─
const bRow = await db.savedSearch.findFirst({ where: { ledgerId: ledger.id, userId: b.id } });
async function tryDelete(userId, id) {
  const row = await db.savedSearch.findUnique({ where: { id } });
  if (!row || row.ledgerId !== ledger.id || row.userId !== userId) return "FORBIDDEN";
  await db.savedSearch.delete({ where: { id } });
  return "OK";
}
check("他人の保存は消せない", (await tryDelete(a.id, bRow.id)) === "FORBIDDEN");
check("残っている", (await db.savedSearch.count({ where: { id: bRow.id } })) === 1);
check("自分の保存は消せる", (await tryDelete(b.id, bRow.id)) === "OK");

// ── 初回案内 ───────────────────────────────────────
const fresh = await db.user.findUnique({ where: { id: a.id } });
check("最初は未案内", fresh.onboardedAt === null);
await db.user.update({ where: { id: a.id }, data: { onboardedAt: new Date() } });
const closed = await db.user.findUnique({ where: { id: a.id } });
check("閉じた記録が残る", closed.onboardedAt !== null);

// カテゴリを自分で足したかの判定（queries.ts と同じ）。
const seeded = await db.category.create({
  data: { ledgerId: ledger.id, name: "初期カテゴリ", type: "EXPENSE" },
});
const own = await db.category.create({
  data: {
    ledgerId: ledger.id,
    name: "自分で足した",
    type: "EXPENSE",
    createdAt: new Date(Date.now() + 120_000),
  },
});
const l = await db.ledger.findUnique({ where: { id: ledger.id } });
const isOwn = (c) => c.createdAt.getTime() - l.createdAt.getTime() > 60_000;
check("帳簿と同時に入ったカテゴリは自作扱いにしない", isOwn(seeded) === false);
check("後から足したカテゴリは自作扱いになる", isOwn(own) === true);

// ── 後始末 ─────────────────────────────────────────
await db.ledger.delete({ where: { id: ledger.id } });
const left = await db.savedSearch.count({ where: { ledgerId: ledger.id } });
check("帳簿を消すと保存も残らない", left === 0, `${left}件`);

await db.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
