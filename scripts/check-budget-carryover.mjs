// 予算の繰り越しと、サブカテゴリの支出が親の予算に数えられることを実データで確かめる。
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

const tag = "bud-" + Date.now().toString().slice(-6);
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

const now = new Date();
const thisMonth = new Date(now.getFullYear(), now.getMonth(), 10, 12, 0, 0);
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10, 12, 0, 0);

// 先月は 30,000 の予算に対して 18,000 使った（残り 12,000）。
// 今月は親に 5,000、サブカテゴリに 4,000。
await db.transaction.createMany({
  data: [
    { ledgerId: ledger.id, type: "EXPENSE", amount: 18000, occurredAt: lastMonth, categoryId: food.id },
    { ledgerId: ledger.id, type: "EXPENSE", amount: 5000, occurredAt: thisMonth, categoryId: food.id },
    { ledgerId: ledger.id, type: "EXPENSE", amount: 4000, occurredAt: thisMonth, categoryId: eatout.id },
  ],
});

const budget = await db.budget.create({
  data: {
    ledgerId: ledger.id,
    categoryId: food.id,
    period: "MONTHLY",
    amount: 30000,
    carryOver: false,
    startMonth: new Date(now.getFullYear(), now.getMonth(), 1),
  },
});

/** queries.ts と同じ手順を再現する（TS を直接読めないため）。 */
async function rowFor(carryOver) {
  await db.budget.update({ where: { id: budget.id }, data: { carryOver } });
  const b = await db.budget.findUnique({ where: { id: budget.id } });

  const range = (d) => ({
    start: new Date(d.getFullYear(), d.getMonth(), 1),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
  });
  const cur = range(now);
  const prev = range(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const spentIn = async ({ start, end }) => {
    const rows = await db.transaction.groupBy({
      by: ["categoryId"],
      where: { ledgerId: ledger.id, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const direct = new Map(rows.map((r) => [r.categoryId, r._sum.amount ?? 0]));
    const children = await db.category.findMany({ where: { parentId: food.id } });
    return (
      (direct.get(food.id) ?? 0) +
      children.reduce((s, c) => s + (direct.get(c.id) ?? 0), 0)
    );
  };

  const spent = await spentIn(cur);
  const prevSpent = await spentIn(prev);
  const carriedOver = b.carryOver ? Math.max(0, b.amount - prevSpent) : 0;
  return { amount: b.amount, carriedOver, available: b.amount + carriedOver, spent };
}

const off = await rowFor(false);
check("サブカテゴリの支出が親の予算に数えられる", off.spent === 9000, `${off.spent}`);
check("繰り越しオフなら加算されない", off.carriedOver === 0, `${off.carriedOver}`);
check("使える額は予算額のまま", off.available === 30000, `${off.available}`);

const on = await rowFor(true);
check("先月の使い残しが繰り越される", on.carriedOver === 12000, `${on.carriedOver}`);
check("使える額に繰り越しが足される", on.available === 42000, `${on.available}`);
check("残額が繰り越し込みで計算される", on.available - on.spent === 33000, `${on.available - on.spent}`);

// 使いすぎた月はマイナスを持ち越さない
await db.transaction.create({
  data: {
    ledgerId: ledger.id,
    type: "EXPENSE",
    amount: 50000,
    occurredAt: lastMonth,
    categoryId: food.id,
  },
});
const over = await rowFor(true);
check("先月使いすぎた分はマイナスで持ち越さない", over.carriedOver === 0, `${over.carriedOver}`);

await db.ledger.delete({ where: { id: ledger.id } }).catch(() => {});
await db.user.delete({ where: { id: user.id } }).catch(() => {});
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
