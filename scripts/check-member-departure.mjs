// 共有帳簿でメンバーが退会したとき、そのメンバーの記録が消えないことを実DBで確認する。
import { PrismaClient } from "/home/user/Claude_flow2/src/generated/prisma/index.js";

const db = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/tsumiki" },
  },
});
const tag = "setnull-" + Date.now().toString().slice(-6);
const results = [];
const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? " :: " + d : ""}`); };

const owner = await db.user.create({ data: { email: `${tag}-owner@t.test`, name: "オーナー" } });
const member = await db.user.create({ data: { email: `${tag}-member@t.test`, name: "メンバー" } });
const ledger = await db.ledger.create({
  data: {
    name: `${tag} 共有帳簿`, type: "POD", ownerId: owner.id,
    members: { create: [{ userId: owner.id, role: "OWNER" }, { userId: member.id, role: "EDITOR" }] },
  },
});

const txn = await db.transaction.create({
  data: { ledgerId: ledger.id, createdByUserId: member.id, type: "EXPENSE", amount: 1234, occurredAt: new Date() },
});
const rec = await db.recurringTransaction.create({
  data: { ledgerId: ledger.id, createdByUserId: member.id, type: "EXPENSE", amount: 500, nextRunAt: new Date() },
});
const sub = await db.subscription.create({
  data: { ledgerId: ledger.id, ownerUserId: member.id, name: `${tag} Netflix`, amount: 1490, nextRenewalAt: new Date() },
});

console.log("--- メンバーを退会させる ---");
await db.user.delete({ where: { id: member.id } });

const t2 = await db.transaction.findUnique({ where: { id: txn.id } });
check("取引が残る", !!t2, t2 ? `createdByUserId=${t2.createdByUserId}` : "消えた");
check("取引の記録者が null になる", t2?.createdByUserId === null);

const r2 = await db.recurringTransaction.findUnique({ where: { id: rec.id } });
check("定期取引が残る", !!r2, r2 ? `createdByUserId=${r2.createdByUserId}` : "消えた");

const s2 = await db.subscription.findUnique({ where: { id: sub.id } });
check("サブスクが残る", !!s2, s2 ? `ownerUserId=${s2.ownerUserId}` : "消えた");

const ledgerStill = await db.ledger.findUnique({ where: { id: ledger.id } });
check("帳簿が残る", !!ledgerStill);

const membersLeft = await db.ledgerMember.count({ where: { ledgerId: ledger.id } });
check("退会メンバーのメンバーシップだけ消える", membersLeft === 1, `残り${membersLeft}件`);

// 後片付け
await db.ledger.delete({ where: { id: ledger.id } }).catch(() => {});
await db.user.delete({ where: { id: owner.id } }).catch(() => {});
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
