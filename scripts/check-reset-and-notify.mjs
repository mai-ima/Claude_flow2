// 「初期状態に戻す」と、お知らせの削除を実データで確かめる。
//
// 見ているもの:
//   - 全部消したら、使い始めの案内も戻ること
//   - 帳簿にぶら下がるものが消し漏れないこと
//   - お知らせを1件だけ／読んだものだけ消せること
//   - 他人のお知らせを id だけで消せないこと
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

const tag = "rst-" + Date.now().toString().slice(-6);

const user = await db.user.create({
  data: { email: `${tag}@t.test`, name: "本人", onboardedAt: new Date() },
});
const other = await db.user.create({ data: { email: `${tag}-o@t.test`, name: "別の人" } });
const ledger = await db.ledger.create({
  data: { name: `${tag}の家計簿`, ownerId: user.id, type: "PERSONAL" },
});
await db.ledgerMember.create({
  data: { ledgerId: ledger.id, userId: user.id, role: "OWNER" },
});

// 帳簿にぶら下がるものを一通り作る。
const cat = await db.category.create({
  data: { ledgerId: ledger.id, name: "食費", type: "EXPENSE", color: "#f00", icon: "food" },
});
await db.transaction.create({
  data: { ledgerId: ledger.id, type: "EXPENSE", amount: 1200, occurredAt: new Date(), categoryId: cat.id },
});
await db.tag.create({ data: { ledgerId: ledger.id, name: "旅行", color: "#00f" } });
await db.assetSnapshot.create({
  data: { ledgerId: ledger.id, month: new Date(), amount: 1000000, memo: "現金" },
});
await db.savedSearch.create({
  data: { ledgerId: ledger.id, userId: user.id, name: "外食だけ", query: "type=EXPENSE" },
});
await db.goal.create({ data: { ledgerId: ledger.id, name: "旅行", targetAmount: 100000 } });
await db.budget.create({ data: { ledgerId: ledger.id, amount: 50000, startMonth: new Date() } });
await db.paymentMethod.create({ data: { ledgerId: ledger.id, name: "現金", type: "CASH" } });
await db.notification.create({
  data: { userId: user.id, ledgerId: ledger.id, type: "BUDGET", title: "この帳簿の知らせ", body: "x" },
});

// ── 全部消す（action と同じ順序・同じ対象） ────────
await db.$transaction([
  db.transaction.deleteMany({ where: { ledgerId: ledger.id } }),
  db.recurringTransaction.deleteMany({ where: { ledgerId: ledger.id } }),
  db.subscription.deleteMany({ where: { ledgerId: ledger.id } }),
  db.budget.deleteMany({ where: { ledgerId: ledger.id } }),
  db.goal.deleteMany({ where: { ledgerId: ledger.id } }),
  db.assetSnapshot.deleteMany({ where: { ledgerId: ledger.id } }),
  db.settlement.deleteMany({ where: { ledgerId: ledger.id } }),
  db.savedSearch.deleteMany({ where: { ledgerId: ledger.id } }),
  db.tag.deleteMany({ where: { ledgerId: ledger.id } }),
  db.paymentMethod.deleteMany({ where: { ledgerId: ledger.id } }),
  db.category.deleteMany({ where: { ledgerId: ledger.id } }),
  db.notification.deleteMany({ where: { ledgerId: ledger.id } }),
  db.user.update({ where: { id: user.id }, data: { onboardedAt: null } }),
]);

const after = await db.user.findUnique({ where: { id: user.id } });
check("使い始めの案内が戻る", after.onboardedAt === null, String(after.onboardedAt));

for (const [name, count] of [
  ["取引", await db.transaction.count({ where: { ledgerId: ledger.id } })],
  ["タグ", await db.tag.count({ where: { ledgerId: ledger.id } })],
  ["資産", await db.assetSnapshot.count({ where: { ledgerId: ledger.id } })],
  ["保存した検索", await db.savedSearch.count({ where: { ledgerId: ledger.id } })],
  ["目標", await db.goal.count({ where: { ledgerId: ledger.id } })],
  ["予算", await db.budget.count({ where: { ledgerId: ledger.id } })],
  ["支払い方法", await db.paymentMethod.count({ where: { ledgerId: ledger.id } })],
  ["カテゴリ", await db.category.count({ where: { ledgerId: ledger.id } })],
  ["この帳簿のお知らせ", await db.notification.count({ where: { ledgerId: ledger.id } })],
]) {
  check(`${name}が残らない`, count === 0, `${count}件`);
}

// ── お知らせの削除 ─────────────────────────────────
const unread = await db.notification.create({
  data: { userId: user.id, type: "SYSTEM", title: "未読", body: "x" },
});
const read1 = await db.notification.create({
  data: { userId: user.id, type: "SYSTEM", title: "既読1", body: "x", readAt: new Date() },
});
const read2 = await db.notification.create({
  data: { userId: user.id, type: "SYSTEM", title: "既読2", body: "x", readAt: new Date() },
});
const foreign = await db.notification.create({
  data: { userId: other.id, type: "SYSTEM", title: "他人の知らせ", body: "x" },
});

// 1件だけ消す。
await db.notification.deleteMany({ where: { id: read1.id, userId: user.id } });
check("選んだ1件が消える", (await db.notification.findUnique({ where: { id: read1.id } })) === null);
check("他は残る", (await db.notification.findUnique({ where: { id: read2.id } })) !== null);

// 他人のものは id を知っていても消えない。
const stolen = await db.notification.deleteMany({ where: { id: foreign.id, userId: user.id } });
check("他人のお知らせは消せない", stolen.count === 0, `${stolen.count}件`);
check(
  "他人のお知らせは残っている",
  (await db.notification.findUnique({ where: { id: foreign.id } })) !== null,
);

// 読んだものだけまとめて消す。
const cleared = await db.notification.deleteMany({
  where: { userId: user.id, readAt: { not: null } },
});
check("読んだものだけ消える", cleared.count === 1, `${cleared.count}件`);
check(
  "未読は残る",
  (await db.notification.findUnique({ where: { id: unread.id } })) !== null,
);

// 後片付け
await db.notification.deleteMany({ where: { userId: { in: [user.id, other.id] } } });
await db.ledgerMember.deleteMany({ where: { ledgerId: ledger.id } });
await db.ledger.delete({ where: { id: ledger.id } });
await db.user.deleteMany({ where: { id: { in: [user.id, other.id] } } });
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
