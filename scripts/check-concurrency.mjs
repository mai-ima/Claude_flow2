// 同時に積み立てても金額が消えないことを確かめる。
//
// 直す前は「読んで、足して、書く」だったため、2人が同時に押すと
// あとの書き込みが先の分を丸ごと上書きし、片方の積立が消えていた。
// ここでは実際に並行で走らせて、合計が合うかを見る。
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

const tag = "cc-" + Date.now().toString().slice(-6);
const user = await db.user.create({
  data: { email: `${tag}@t.test`, name: "利用者", emailVerified: new Date() },
});
const ledger = await db.ledger.create({
  data: {
    name: `${tag} 帳簿`,
    type: "POD",
    ownerId: user.id,
    members: { create: { userId: user.id, role: "OWNER" } },
  },
});

// actions.ts の contributeGoal と同じ1文。
async function contribute(goalId, amount) {
  const rows = await db.$queryRaw`
    UPDATE "Goal" g
    SET "currentAmount" = GREATEST(0, g."currentAmount" + ${amount})
    FROM "Goal" old
    WHERE g.id = old.id AND g.id = ${goalId} AND g."ledgerId" = ${ledger.id}
    RETURNING old."currentAmount" AS before, g."currentAmount" AS after
  `;
  return rows[0];
}

// 直す前のやり方（比較用）。読んでから書く。
async function contributeOldWay(goalId, amount) {
  const g = await db.goal.findUnique({ where: { id: goalId } });
  const next = Math.max(0, g.currentAmount + amount);
  // 読みと書きの間に、別の処理が入り込む余地を作る（本番でも同じ隙がある）。
  await new Promise((r) => setTimeout(r, 20));
  await db.goal.update({ where: { id: goalId }, data: { currentAmount: next } });
}

// ── 直したやり方: 10回同時に 1,000円ずつ ────────────
const goal = await db.goal.create({
  data: { ledgerId: ledger.id, name: "旅行", targetAmount: 200000, currentAmount: 0 },
});
await Promise.all(Array.from({ length: 10 }, () => contribute(goal.id, 1000)));
const after = await db.goal.findUnique({ where: { id: goal.id } });
check("同時に10回積み立てても全部反映される", after.currentAmount === 10000, `${after.currentAmount}円`);

// ── 直す前のやり方: 同じことをすると消える ──────────
const old = await db.goal.create({
  data: { ledgerId: ledger.id, name: "比較用", targetAmount: 200000, currentAmount: 0 },
});
await Promise.all(Array.from({ length: 10 }, () => contributeOldWay(old.id, 1000)));
const oldAfter = await db.goal.findUnique({ where: { id: old.id } });
check(
  "直す前のやり方では実際に消える（この検証が意味を持つことの確認）",
  oldAfter.currentAmount < 10000,
  `${oldAfter.currentAmount}円 しか入らなかった`,
);

// ── 引き出しは0で止まる ─────────────────────────────
const g2 = await db.goal.create({
  data: { ledgerId: ledger.id, name: "引き出し", targetAmount: 100000, currentAmount: 5000 },
});
const r = await contribute(g2.id, -8000);
check("残高を超えて引き出しても0で止まる", r.after === 0, `${r.after}円`);
check("実際に動いた額を返す", r.before - r.after === 5000, `${r.before} → ${r.after}`);

// ── 他の帳簿の目標は動かせない ──────────────────────
const other = await db.ledger.create({
  data: {
    name: `${tag} 別`,
    type: "SOLO",
    ownerId: user.id,
    members: { create: { userId: user.id, role: "OWNER" } },
  },
});
const foreign = await db.goal.create({
  data: { ledgerId: other.id, name: "他人の目標", targetAmount: 100000, currentAmount: 3000 },
});
const none = await contribute(foreign.id, 1000);
check("他の帳簿の目標は更新されない", none === undefined);
const untouched = await db.goal.findUnique({ where: { id: foreign.id } });
check("金額も変わっていない", untouched.currentAmount === 3000, `${untouched.currentAmount}円`);

await db.ledger.deleteMany({ where: { id: { in: [ledger.id, other.id] } } });
await db.user.delete({ where: { id: user.id } });
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
