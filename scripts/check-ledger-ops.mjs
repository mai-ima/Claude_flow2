// 帳簿の移譲・退出・削除・退会ガードを実DBで検証する。
// Server Action は認証セッションを要求するため、ここでは同じ判定条件を
// DB レベルで組み立てて、スキーマと制約が期待通りに効くことを確認する。
import { PrismaClient } from "../src/generated/prisma/index.js";

const url = process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/tsumiki";
const db = new PrismaClient({ datasources: { db: { url } } });
const tag = "ledgerops-" + Date.now().toString().slice(-6);
const results = [];
const check = (n, ok, d = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? " :: " + d : ""}`);
};

async function makeUser(suffix) {
  const u = await db.user.create({ data: { email: `${tag}-${suffix}@t.test`, name: suffix } });
  await db.ledger.create({
    data: {
      name: `${suffix}の家計簿`,
      type: "PERSONAL",
      ownerId: u.id,
      members: { create: { userId: u.id, role: "OWNER" } },
    },
  });
  return u;
}

const alice = await makeUser("alice");
const bob = await makeUser("bob");

const pod = await db.ledger.create({
  data: {
    name: `${tag} 共有`,
    type: "POD",
    ownerId: alice.id,
    members: { create: [{ userId: alice.id, role: "OWNER" }, { userId: bob.id, role: "EDITOR" }] },
  },
});

// ── 退会ガード（T3-5）: alice はオーナーなので退会できない条件になるはず ──
const blocking = await db.ledger.count({
  where: { ownerId: alice.id, type: "POD", members: { some: { userId: { not: alice.id } } } },
});
check("オーナーは退会がブロックされる条件になる", blocking === 1, `該当${blocking}件`);

const bobBlocking = await db.ledger.count({
  where: { ownerId: bob.id, type: "POD", members: { some: { userId: { not: bob.id } } } },
});
check("メンバーは退会をブロックされない", bobBlocking === 0);

// ── 移譲（T3-2）: ownerId と role が同時に動く ──
await db.$transaction([
  db.ledger.update({ where: { id: pod.id }, data: { ownerId: bob.id } }),
  db.ledgerMember.update({
    where: { ledgerId_userId: { ledgerId: pod.id, userId: bob.id } },
    data: { role: "OWNER" },
  }),
  db.ledgerMember.update({
    where: { ledgerId_userId: { ledgerId: pod.id, userId: alice.id } },
    data: { role: "EDITOR" },
  }),
]);
const afterTransfer = await db.ledger.findUnique({
  where: { id: pod.id },
  include: { members: true },
});
const bobRole = afterTransfer.members.find((m) => m.userId === bob.id)?.role;
const aliceRole = afterTransfer.members.find((m) => m.userId === alice.id)?.role;
check(
  "移譲で ownerId と role が食い違わない",
  afterTransfer.ownerId === bob.id && bobRole === "OWNER" && aliceRole === "EDITOR",
  `ownerId=${afterTransfer.ownerId === bob.id ? "bob" : "alice"} bob=${bobRole} alice=${aliceRole}`,
);

// ── 退出（T3-3）: 非オーナーはメンバーシップだけ消える ──
const txn = await db.transaction.create({
  data: { ledgerId: pod.id, createdByUserId: alice.id, type: "EXPENSE", amount: 800, occurredAt: new Date() },
});
await db.ledgerMember.delete({
  where: { ledgerId_userId: { ledgerId: pod.id, userId: alice.id } },
});
const stillThere = await db.transaction.findUnique({ where: { id: txn.id } });
check("退出しても記録は帳簿に残る", !!stillThere);
const remaining = await db.ledgerMember.count({ where: { ledgerId: pod.id } });
check("退出でメンバーが1人減る", remaining === 1, `残り${remaining}人`);

// ── 削除（T3-4）: 帳簿を消すと配下も消える ──
await db.ledger.delete({ where: { id: pod.id } });
const goneLedger = await db.ledger.findUnique({ where: { id: pod.id } });
const goneTxn = await db.transaction.findUnique({ where: { id: txn.id } });
check("帳簿削除で帳簿が消える", goneLedger === null);
check("帳簿削除で配下の取引も消える", goneTxn === null);

// 個人帳簿は残っていること
const alicePersonal = await db.ledger.count({ where: { ownerId: alice.id, type: "PERSONAL" } });
check("個人帳簿は影響を受けない", alicePersonal === 1);

// 後片付け
await db.user.deleteMany({ where: { email: { startsWith: tag } } });
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
