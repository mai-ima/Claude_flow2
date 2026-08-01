// 招待の受け渡しを実データで確かめる。
// とくに「リンクを転送された他人が入れないこと」を見る。
import { createHash, randomBytes } from "node:crypto";
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

const hash = (raw) => createHash("sha256").update(raw).digest("hex");
const tag = "inv-" + Date.now().toString().slice(-6);

const owner = await db.user.create({
  data: { email: `${tag}-o@t.test`, name: "オーナー", emailVerified: new Date() },
});
const invitee = await db.user.create({
  data: { email: `${tag}-i@t.test`, name: "招待された人", emailVerified: new Date() },
});
const stranger = await db.user.create({
  data: { email: `${tag}-x@t.test`, name: "第三者", emailVerified: new Date() },
});
const unverified = await db.user.create({
  data: { email: `${tag}-u@t.test`, name: "未確認", emailVerified: null },
});

const ledger = await db.ledger.create({
  data: {
    name: `${tag} 共有帳簿`,
    type: "POD",
    ownerId: owner.id,
    members: { create: { userId: owner.id, role: "OWNER" } },
  },
});

const raw = randomBytes(32).toString("base64url");
const invite = await db.ledgerInvite.create({
  data: {
    ledgerId: ledger.id,
    email: invitee.email,
    role: "EDITOR",
    token: hash(raw),
    invitedByUserId: owner.id,
    expiresAt: new Date(Date.now() + 7 * 86400_000),
  },
});

check("トークンは平文で保存されない", invite.token !== raw && invite.token.length === 64);

// invites.ts の acceptInvite と同じ判定を再現する。
async function tryAccept(user, token) {
  const row = await db.ledgerInvite.findUnique({ where: { token: hash(token) } });
  if (!row) return "NOT_FOUND";
  if (row.revokedAt) return "REVOKED";
  if (row.acceptedAt) return "USED";
  if (row.expiresAt < new Date()) return "EXPIRED";
  if ((user.email ?? "").toLowerCase() !== row.email) return "EMAIL_MISMATCH";
  if (!user.emailVerified) return "UNVERIFIED";
  await db.$transaction([
    db.ledgerMember.upsert({
      where: { ledgerId_userId: { ledgerId: row.ledgerId, userId: user.id } },
      create: { ledgerId: row.ledgerId, userId: user.id, role: row.role },
      update: { role: row.role },
    }),
    db.ledgerInvite.update({ where: { id: row.id }, data: { acceptedAt: new Date() } }),
  ]);
  return "OK";
}

check("リンクを転送された第三者は入れない", (await tryAccept(stranger, raw)) === "EMAIL_MISMATCH");
check(
  "第三者はメンバーになっていない",
  (await db.ledgerMember.count({ where: { ledgerId: ledger.id, userId: stranger.id } })) === 0,
);

// 宛先は合っているがメール未確認
const spoof = { ...unverified, email: invitee.email };
check("メール未確認では入れない", (await tryAccept(spoof, raw)) === "UNVERIFIED");

check("でたらめなトークンは通らない", (await tryAccept(invitee, "not-a-real-token")) === "NOT_FOUND");

check("招待された本人は参加できる", (await tryAccept(invitee, raw)) === "OK");
const member = await db.ledgerMember.findUnique({
  where: { ledgerId_userId: { ledgerId: ledger.id, userId: invitee.id } },
});
check("指定した権限で参加する", member?.role === "EDITOR", member?.role);

check("同じリンクは二度使えない", (await tryAccept(invitee, raw)) === "USED");

// 取り消し
const raw2 = randomBytes(32).toString("base64url");
await db.ledgerInvite.create({
  data: {
    ledgerId: ledger.id,
    email: stranger.email,
    role: "VIEWER",
    token: hash(raw2),
    invitedByUserId: owner.id,
    expiresAt: new Date(Date.now() + 7 * 86400_000),
  },
});
await db.ledgerInvite.updateMany({
  where: { ledgerId: ledger.id, email: stranger.email, acceptedAt: null },
  data: { revokedAt: new Date() },
});
check("取り消した招待は使えない", (await tryAccept(stranger, raw2)) === "REVOKED");

// 期限切れ
const raw3 = randomBytes(32).toString("base64url");
await db.ledgerInvite.create({
  data: {
    ledgerId: ledger.id,
    email: stranger.email,
    role: "VIEWER",
    token: hash(raw3),
    invitedByUserId: owner.id,
    expiresAt: new Date(Date.now() - 1000),
  },
});
check("期限切れの招待は使えない", (await tryAccept(stranger, raw3)) === "EXPIRED");

// 帳簿を消すと招待も消える
await db.ledger.delete({ where: { id: ledger.id } });
const left = await db.ledgerInvite.count({ where: { ledgerId: ledger.id } });
check("帳簿を消すと招待も残らない", left === 0, `${left}件`);

await db.user.deleteMany({
  where: { id: { in: [owner.id, invitee.id, stranger.id, unverified.id] } },
});
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
