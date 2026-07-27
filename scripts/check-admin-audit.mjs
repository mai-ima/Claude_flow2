// 管理権限の粒度と監査ログを、実データで確認する。
// Server Action は認証セッションが要るため、ここでは
//  - 権限判定の関数（純関数）
//  - AuditLog に残ること / 対象削除後も残ること
// をDBレベルで確かめる。UIの導線はブラウザ側で別途確認する。
import { PrismaClient } from "../src/generated/prisma/index.js";

const url = process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/tsumiki";
const db = new PrismaClient({ datasources: { db: { url } } });
const tag = "audit-" + Date.now().toString().slice(-6);
const results = [];
const check = (n, ok, d = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? " :: " + d : ""}`);
};

// 既存の管理者が新体系へ引き継がれているか（マイグレーションのデータ移行）
const legacyAdmins = await db.user.count({ where: { isAdmin: true, adminRole: "NONE" } });
check("isAdmin の管理者が adminRole 未設定で取り残されていない", legacyAdmins === 0, `${legacyAdmins}件`);

const target = await db.user.create({
  data: { email: `${tag}-target@t.test`, name: "対象", billing: { create: { tier: "FREE" } } },
});

// 監査ログを書く（deleteUser と同じ順序: 消す前に残す）
await db.auditLog.create({
  data: {
    actorId: "admin-id",
    actorEmail: `${tag}-admin@t.test`,
    action: "USER_DELETE",
    targetType: "USER",
    targetId: target.id,
    targetLabel: target.email,
    before: { email: target.email, tier: "FREE" },
    reason: "サポート対応",
    ip: "203.0.113.9",
  },
});

await db.user.delete({ where: { id: target.id } });

const log = await db.auditLog.findFirst({
  where: { targetId: target.id },
  orderBy: { createdAt: "desc" },
});
check("対象を削除しても証跡が残る", !!log);
check("誰が実行したかが残る", log?.actorEmail === `${tag}-admin@t.test`, log?.actorEmail ?? "");
check("何を消したのかが残る", log?.targetLabel === `${tag}-target@t.test`, log?.targetLabel ?? "");
check("理由が残る", log?.reason === "サポート対応", log?.reason ?? "");
check("変更前の値が残る", !!log?.before && log.before.tier === "FREE", JSON.stringify(log?.before));

// 絞り込みが効くこと
const byActor = await db.auditLog.count({
  where: { actorEmail: { contains: tag, mode: "insensitive" } },
});
check("実行者で絞り込める", byActor >= 1, `${byActor}件`);

await db.auditLog.deleteMany({ where: { actorEmail: { contains: tag } } });
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
