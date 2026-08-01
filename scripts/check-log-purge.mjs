// ログの削除まわりを実データで確かめる。
// 「消せること」より「消しすぎないこと」を重点的に見る。
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

const day = 24 * 60 * 60 * 1000;
const now = Date.now();
const tag = "purge-" + Date.now().toString().slice(-6);

// ── 自動処理の履歴 ─────────────────────────────────
const old1 = await db.cronRun.create({
  data: {
    job: `${tag}-old`,
    status: "SUCCESS",
    trigger: "SCHEDULE",
    startedAt: new Date(now - 40 * day),
  },
});
const fresh1 = await db.cronRun.create({
  data: { job: `${tag}-new`, status: "SUCCESS", trigger: "SCHEDULE", startedAt: new Date(now) },
});

const cutoff30 = new Date(now - 30 * day);
const delCron = await db.cronRun.deleteMany({
  where: { job: { startsWith: tag }, startedAt: { lt: cutoff30 } },
});
check("30日より古い実行だけが消える", delCron.count === 1, `${delCron.count}件`);
check(
  "新しい実行は残る",
  (await db.cronRun.findUnique({ where: { id: fresh1.id } })) !== null,
);
check("古い実行は消えている", (await db.cronRun.findUnique({ where: { id: old1.id } })) === null);

// ── エラーは lastSeen で古さを測る ────────────────
// 最初に記録された時刻が古くても、いま出ているエラーは消してはいけない。
const stillHappening = await db.errorEvent.create({
  data: {
    message: `${tag} まだ起きているエラー`,
    level: "error",
    fingerprint: `${tag}-still`,
    count: 5,
    createdAt: new Date(now - 200 * day),
    lastSeen: new Date(now),
  },
});
const settled = await db.errorEvent.create({
  data: {
    message: `${tag} もう出ていないエラー`,
    level: "error",
    fingerprint: `${tag}-settled`,
    count: 1,
    createdAt: new Date(now - 200 * day),
    lastSeen: new Date(now - 100 * day),
  },
});
const delErr = await db.errorEvent.deleteMany({
  where: { message: { startsWith: tag }, lastSeen: { lt: new Date(now - 90 * day) } },
});
check("最後に見た時刻で判断している", delErr.count === 1, `${delErr.count}件`);
check(
  "いまも出ているエラーは、最初の記録が古くても残る",
  (await db.errorEvent.findUnique({ where: { id: stillHappening.id } })) !== null,
);
check(
  "収まったエラーは消える",
  (await db.errorEvent.findUnique({ where: { id: settled.id } })) === null,
);

// ── 選んで消す ─────────────────────────────────────
const a = await db.emailLog.create({
  data: { to: `${tag}-a@t.test`, subject: "A", kind: "REMINDER", status: "SENT" },
});
const b = await db.emailLog.create({
  data: { to: `${tag}-b@t.test`, subject: "B", kind: "REMINDER", status: "SENT" },
});
await db.emailLog.deleteMany({ where: { id: { in: [a.id] } } });
check("選んだものだけ消える", (await db.emailLog.findUnique({ where: { id: a.id } })) === null);
check("選んでいないものは残る", (await db.emailLog.findUnique({ where: { id: b.id } })) !== null);
await db.emailLog.deleteMany({ where: { to: { startsWith: tag } } });

// ── 監査ログ: 消したこと自体が残る ────────────────
const admin = await db.user.create({
  data: { email: `${tag}@t.test`, name: "管理者", isAdmin: true, adminRole: "SUPER" },
});
const oldAudit = await db.auditLog.create({
  data: {
    actorId: admin.id,
    actorEmail: admin.email,
    action: "USER_TIER_CHANGE",
    targetType: "USER",
    createdAt: new Date(now - 400 * day),
  },
});
// 実際の action と同じ順序（先に消し、そのあと証跡を書く）で確かめる。
const delAudit = await db.auditLog.deleteMany({
  where: { actorId: admin.id, createdAt: { lt: new Date(now - 365 * day) } },
});
const purgeRecord = await db.auditLog.create({
  data: {
    actorId: admin.id,
    actorEmail: admin.email,
    action: "LOG_PURGE",
    targetType: "SYSTEM",
    targetLabel: "監査ログ",
    after: { 種類: "監査ログ", 条件: "365日より古いもの", 削除件数: delAudit.count },
    reason: "保存期間を過ぎた記録の整理",
  },
});
check("古い監査ログは消える", (await db.auditLog.findUnique({ where: { id: oldAudit.id } })) === null);
check(
  "消したこと自体が監査ログに残る",
  (await db.auditLog.findUnique({ where: { id: purgeRecord.id } })) !== null,
);
check(
  "何をどれだけ消したかが残る",
  purgeRecord.after?.削除件数 === 1 && purgeRecord.reason === "保存期間を過ぎた記録の整理",
  JSON.stringify(purgeRecord.after),
);

// 後片付け
await db.auditLog.deleteMany({ where: { actorId: admin.id } });
await db.cronRun.deleteMany({ where: { job: { startsWith: tag } } });
await db.errorEvent.deleteMany({ where: { message: { startsWith: tag } } });
await db.user.delete({ where: { id: admin.id } });
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
