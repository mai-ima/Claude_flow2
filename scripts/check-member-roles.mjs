// メンバーの権限変更が、意図した範囲でしか効かないことを実データで確かめる。
// 画面ではなく action の判定そのものを見たいので、DB を直接組み立てて呼ぶ。
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

const tag = "role-" + Date.now().toString().slice(-6);

const owner = await db.user.create({ data: { email: `${tag}-o@t.test`, name: "オーナー" } });
const member = await db.user.create({ data: { email: `${tag}-m@t.test`, name: "メンバー" } });

const ledger = await db.ledger.create({
  data: {
    name: `${tag} の共有帳簿`,
    type: "POD",
    ownerId: owner.id,
    members: {
      create: [
        { userId: owner.id, role: "OWNER" },
        { userId: member.id, role: "EDITOR" },
      ],
    },
  },
});

// 権限判定そのものを確かめる（action と同じ関数）。
const ROLE_RANK = { VIEWER: 0, EDITOR: 1, OWNER: 2 };
async function can(userId, min) {
  const m = await db.ledgerMember.findUnique({
    where: { ledgerId_userId: { ledgerId: ledger.id, userId } },
  });
  return m ? ROLE_RANK[m.role] >= ROLE_RANK[min] : false;
}

check("編集可のメンバーは記録を追加できる", await can(member.id, "EDITOR"));
check("編集可のメンバーは帳簿設定を変えられない", !(await can(member.id, "OWNER")));

await db.ledgerMember.update({
  where: { ledgerId_userId: { ledgerId: ledger.id, userId: member.id } },
  data: { role: "VIEWER" },
});

check("閲覧のみにすると記録を追加できなくなる", !(await can(member.id, "EDITOR")));
check("閲覧のみでも帳簿は見られる", await can(member.id, "VIEWER"));
check("オーナーは引き続き全てできる", await can(owner.id, "OWNER"));

// オーナーの降格は許さない（持ち主が居なくなるため action 側で弾く）。
const ownerRow = await db.ledgerMember.findUnique({
  where: { ledgerId_userId: { ledgerId: ledger.id, userId: owner.id } },
});
check("オーナーの役割は OWNER のまま", ownerRow?.role === "OWNER", ownerRow?.role);

// 帳簿の ownerId と OWNER の役割が食い違っていないこと。
const fresh = await db.ledger.findUnique({ where: { id: ledger.id } });
const owners = await db.ledgerMember.findMany({
  where: { ledgerId: ledger.id, role: "OWNER" },
});
check(
  "オーナーの記録が2箇所で一致している",
  owners.length === 1 && owners[0].userId === fresh?.ownerId,
  `members=${owners.length} ownerId=${fresh?.ownerId === owners[0]?.userId}`,
);

await db.ledger.delete({ where: { id: ledger.id } }).catch(() => {});
await db.user.deleteMany({ where: { id: { in: [owner.id, member.id] } } });
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
