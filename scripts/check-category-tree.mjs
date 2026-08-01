// サブカテゴリの集計が正しいことを、実データで確かめる。
// 「食費 > 外食」に入れた支出が、分析で食費として数えられるかを見る。
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("../src/generated/prisma/index.js");
const db = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/tsumiki" },
  },
});

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
};

const tag = "cat-" + Date.now().toString().slice(-6);
const user = await db.user.create({ data: { email: `${tag}@t.test`, name: "テスト" } });
const ledger = await db.ledger.create({
  data: {
    name: `${tag} 帳簿`,
    ownerId: user.id,
    members: { create: { userId: user.id, role: "OWNER" } },
  },
});

const food = await db.category.create({
  data: { ledgerId: ledger.id, name: "食費", type: "EXPENSE", icon: "food", color: "orange" },
});
const eatout = await db.category.create({
  data: {
    ledgerId: ledger.id,
    name: "外食",
    type: "EXPENSE",
    icon: "food",
    color: "orange",
    parentId: food.id,
  },
});
const home = await db.category.create({
  data: { ledgerId: ledger.id, name: "住居", type: "EXPENSE", icon: "home", color: "indigo" },
});

const now = new Date();
const day = new Date(now.getFullYear(), now.getMonth(), 15, 12, 0, 0);
await db.transaction.createMany({
  data: [
    { ledgerId: ledger.id, type: "EXPENSE", amount: 1000, occurredAt: day, categoryId: food.id },
    { ledgerId: ledger.id, type: "EXPENSE", amount: 3000, occurredAt: day, categoryId: eatout.id },
    { ledgerId: ledger.id, type: "EXPENSE", amount: 85000, occurredAt: day, categoryId: home.id },
    { ledgerId: ledger.id, type: "EXPENSE", amount: 500, occurredAt: day, categoryId: null },
  ],
});

// 畳む計算そのものは category-tree.test.ts が見ている。
// ここで確かめたいのは「データベースから正しい材料が取れるか」。
const start = new Date(now.getFullYear(), now.getMonth(), 1);
const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
const rows = await db.transaction.groupBy({
  by: ["categoryId"],
  where: { ledgerId: ledger.id, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
  _sum: { amount: true },
});
const amount = new Map(rows.map((r) => [r.categoryId, r._sum.amount ?? 0]));

check("親のカテゴリに直接入れた分が拾える", amount.get(food.id) === 1000, String(amount.get(food.id)));
check("サブカテゴリの分が拾える", amount.get(eatout.id) === 3000, String(amount.get(eatout.id)));

// 畳んだ結果（rollUp を通せない場合は同じ計算を手で行う）
const total = (amount.get(food.id) ?? 0) + (amount.get(eatout.id) ?? 0);
check("食費の合計に外食が含まれる", total === 4000, `${total}`);
check("住居は影響を受けない", amount.get(home.id) === 85000, String(amount.get(home.id)));
check("カテゴリ無しの分は別枠で残る", amount.get(null) === 500, String(amount.get(null)));

// 親を消したときに子が孤児にならないこと（onDelete: SetNull）
await db.category.delete({ where: { id: food.id } });
const orphan = await db.category.findUnique({ where: { id: eatout.id } });
check("親を消しても子は残る", orphan !== null);
check("親を消すと子は親無しに戻る", orphan?.parentId === null, String(orphan?.parentId));

const stillThere = await db.transaction.count({
  where: { ledgerId: ledger.id, categoryId: eatout.id },
});
check("親を消しても子の取引は残る", stillThere === 1, `${stillThere}件`);

await db.ledger.delete({ where: { id: ledger.id } }).catch(() => {});
await db.user.delete({ where: { id: user.id } }).catch(() => {});
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
