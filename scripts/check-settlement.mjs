// 共有帳簿の精算まわりを実データで確かめる。
// とくに「自分の記録しか直せない権限が、本当に他人の記録を守るか」を見る。
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

const tag = "stl-" + Date.now().toString().slice(-6);
const now = new Date();
const month = new Date(now.getFullYear(), now.getMonth(), 10);

const owner = await db.user.create({
  data: { email: `${tag}-o@t.test`, name: "オーナー", emailVerified: new Date() },
});
const partner = await db.user.create({
  data: { email: `${tag}-p@t.test`, name: "パートナー", emailVerified: new Date() },
});
const kid = await db.user.create({
  data: { email: `${tag}-k@t.test`, name: "こども", emailVerified: new Date() },
});

const ledger = await db.ledger.create({
  data: {
    name: `${tag} 共有帳簿`,
    type: "POD",
    ownerId: owner.id,
    members: {
      create: [
        { userId: owner.id, role: "OWNER", shareRatio: 1 },
        { userId: partner.id, role: "EDITOR", shareRatio: 1 },
        { userId: kid.id, role: "SELF_EDITOR", shareRatio: 0 },
      ],
    },
  },
});

// ── 既定値 ─────────────────────────────────────────
const defaults = await db.ledgerMember.findMany({ where: { ledgerId: ledger.id } });
check("負担の重みが保存される", defaults.find((m) => m.userId === kid.id)?.shareRatio === 0);
check("SELF_EDITOR を保存できる", defaults.find((m) => m.userId === kid.id)?.role === "SELF_EDITOR");

// ── 立て替えの記録 ─────────────────────────────────
const mk = (paidBy, amount, createdBy) =>
  db.transaction.create({
    data: {
      ledgerId: ledger.id,
      createdByUserId: createdBy,
      paidByUserId: paidBy,
      type: "EXPENSE",
      amount,
      occurredAt: month,
    },
  });

const ownerTxn = await mk(owner.id, 30000, owner.id);
await mk(partner.id, 10000, partner.id);
const kidTxn = await mk(null, 2000, kid.id); // 払った人が未記入

check("払った人を保存できる", ownerTxn.paidByUserId === owner.id);
check("払った人は未記入でもよい", kidTxn.paidByUserId === null);

// ── 按分（settlement.ts と同じ数え方） ──────────────
const expenses = await db.transaction.aggregate({
  where: { ledgerId: ledger.id, type: "EXPENSE" },
  _sum: { amount: true },
});
const total = expenses._sum.amount ?? 0;
check("支出の合計が引ける", total === 42000, `${total}円`);

const members = await db.ledgerMember.findMany({ where: { ledgerId: ledger.id } });
const ratioTotal = members.reduce((s, m) => s + m.shareRatio, 0);
const owed = new Map(
  members.map((m) => [m.userId, Math.floor((total * m.shareRatio) / ratioTotal)]),
);
check("重み0の人は負担しない", owed.get(kid.id) === 0);
check("重み1どうしは折半", owed.get(owner.id) === 21000 && owed.get(partner.id) === 21000);

const paidGroups = await db.transaction.groupBy({
  by: ["paidByUserId"],
  where: { ledgerId: ledger.id, type: "EXPENSE" },
  _sum: { amount: true },
});
const paid = new Map(paidGroups.map((g) => [g.paidByUserId, g._sum.amount ?? 0]));
check("払った人が未記入の分は立て替えに数えない", paid.get(null) === 2000);

const netOwner = (paid.get(owner.id) ?? 0) - (owed.get(owner.id) ?? 0);
const netPartner = (paid.get(partner.id) ?? 0) - (owed.get(partner.id) ?? 0);
check("多く払った側が受け取りになる", netOwner === 9000, `${netOwner}円`);
check("少なく払った側が支払いになる", netPartner === -11000, `${netPartner}円`);

// ── 精算の記録 ─────────────────────────────────────
const settlement = await db.settlement.create({
  data: {
    ledgerId: ledger.id,
    fromUserId: partner.id,
    toUserId: owner.id,
    amount: 9000,
    settledAt: now,
    createdByUserId: owner.id,
  },
});
const records = await db.settlement.findMany({ where: { ledgerId: ledger.id } });
check("精算を記録できる", records.length === 1 && records[0].amount === 9000);

// 精算後の差引（settledAmounts と同じ数え方）
const settled = new Map();
for (const r of records) {
  if (r.fromUserId) settled.set(r.fromUserId, (settled.get(r.fromUserId) ?? 0) - r.amount);
  if (r.toUserId) settled.set(r.toUserId, (settled.get(r.toUserId) ?? 0) + r.amount);
}
check(
  "精算した分だけ差引が減る",
  netOwner - (settled.get(owner.id) ?? 0) === 0,
  `${netOwner - (settled.get(owner.id) ?? 0)}円`,
);

// 家計簿の記録は精算で変わらない
const after = await db.transaction.findUnique({ where: { id: ownerTxn.id } });
check("精算しても家計簿の金額は変わらない", after?.amount === 30000);

// ── SELF_EDITOR の守り ─────────────────────────────
// actions.ts の deleteMany と同じ where を再現する。
async function selfEditorDelete(userId, ids) {
  const { count } = await db.transaction.deleteMany({
    where: { id: { in: ids }, ledgerId: ledger.id, createdByUserId: userId },
  });
  return count;
}
const removed = await selfEditorDelete(kid.id, [ownerTxn.id]);
check("SELF_EDITOR は他人の記録を消せない", removed === 0);
check(
  "他人の記録は残っている",
  (await db.transaction.count({ where: { id: ownerTxn.id } })) === 1,
);
check("SELF_EDITOR は自分の記録を消せる", (await selfEditorDelete(kid.id, [kidTxn.id])) === 1);

// ── 退会しても記録は残る ───────────────────────────
await db.ledgerMember.deleteMany({ where: { ledgerId: ledger.id, userId: partner.id } });
await db.user.delete({ where: { id: partner.id } });
const orphan = await db.settlement.findUnique({ where: { id: settlement.id } });
check("退会しても精算の記録は残る", orphan !== null);
check("退会した相手は null になる", orphan?.fromUserId === null);
const orphanTxn = await db.transaction.findFirst({
  where: { ledgerId: ledger.id, amount: 10000 },
});
check("退会しても取引は残る", orphanTxn !== null);
check("払った人は null になる", orphanTxn?.paidByUserId === null);

// ── 帳簿を消すと精算も消える ───────────────────────
await db.ledger.delete({ where: { id: ledger.id } });
const left = await db.settlement.count({ where: { ledgerId: ledger.id } });
check("帳簿を消すと精算も残らない", left === 0, `${left}件`);

await db.user.deleteMany({ where: { id: { in: [owner.id, kid.id] } } });
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
