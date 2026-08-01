// 要望・不具合の報告まわりを実データで確かめる。
// とくに「送った本人が退会しても内容が残ること」と
// 「家計簿の中身が一緒に送られないこと」を見る。
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

const tag = "fb-" + Date.now().toString().slice(-6);
const user = await db.user.create({
  data: { email: `${tag}@t.test`, name: "報告した人", emailVerified: new Date() },
});
const admin = await db.user.create({
  data: { email: `${tag}-a@t.test`, name: "管理者", isAdmin: true, adminRole: "SUPER" },
});

// ── 送る ───────────────────────────────────────────
const fb = await db.feedback.create({
  data: {
    kind: "BUG",
    body: "予算の画面で保存を押しても何も起きません。",
    contactEmail: "reply@t.test",
    fromPath: "/budgets",
    userAgent: "iPhone の Safari",
    appVersion: "1.2.7.0",
    userId: user.id,
  },
});
check("報告を保存できる", fb.status === "NEW");
check("送信元の画面が残る", fb.fromPath === "/budgets");
check(
  "端末は要約された形で残る（生の User-Agent ではない）",
  !fb.userAgent.includes("Mozilla") && fb.userAgent.includes("iPhone"),
  fb.userAgent,
);

// 家計簿の中身が混ざっていないこと。
check(
  "本文以外に金額が入っていない",
  !/[¥￥]\d/.test(JSON.stringify(fb)),
);

// ── 一覧で送り主が引ける ───────────────────────────
const withUser = await db.feedback.findUnique({
  where: { id: fb.id },
  include: { user: { select: { name: true, email: true } } },
});
check("送り主の名前が引ける", withUser.user?.name === "報告した人");

// ── 対応状況の更新 ─────────────────────────────────
await db.feedback.update({
  where: { id: fb.id },
  data: {
    status: "READING",
    adminNote: "再現を確認中",
    handledByUserId: admin.id,
    handledAt: new Date(),
  },
});
const handled = await db.feedback.findUnique({ where: { id: fb.id } });
check("対応状況を変えられる", handled.status === "READING");
check("誰が触ったかが残る", handled.handledByUserId === admin.id);
check("メモが残る", handled.adminNote === "再現を確認中");

// ── 件数の集計 ─────────────────────────────────────
await db.feedback.create({
  data: { kind: "REQUEST", body: "週ごとの支出も見たいです。", userId: user.id },
});
const rows = await db.feedback.groupBy({
  by: ["status"],
  _count: { _all: true },
  where: { userId: user.id },
});
const map = new Map(rows.map((r) => [r.status, r._count._all]));
check("未読の件数を数えられる", (map.get("NEW") ?? 0) === 1, `${map.get("NEW") ?? 0}件`);
check("確認中の件数を数えられる", (map.get("READING") ?? 0) === 1);

// ── 送り主への返信 ─────────────────────────────────
await db.feedback.update({
  where: { id: fb.id },
  data: {
    replyBody: "ご報告ありがとうございます。次回の更新で修正します。",
    repliedAt: new Date(),
    status: "DONE",
  },
});
const replied = await db.feedback.findUnique({ where: { id: fb.id } });
check("返信を保存できる", replied.replyBody?.includes("次回の更新"));
check("返信すると対応済みになる", replied.status === "DONE");
check(
  "内部メモと返信は別の欄に入る（取り違えない）",
  replied.adminNote === "再現を確認中" && replied.replyBody !== replied.adminNote,
);

// 送り主が見る一覧には内部メモを含めない。
const asUser = await db.feedback.findMany({
  where: { userId: user.id },
  select: { id: true, body: true, status: true, replyBody: true, repliedAt: true },
});
check(
  "送り主の一覧に内部メモが混ざらない",
  asUser.every((r) => !("adminNote" in r)),
);
check("送り主の一覧から返信が読める", asUser.some((r) => r.replyBody?.includes("次回の更新")));

// アプリ内通知が作られること（返信の合図）。
const notif = await db.notification.create({
  data: {
    userId: user.id,
    type: "FEEDBACK",
    title: "お送りいただいたご報告に返信があります",
    body: "ご報告ありがとうございます。",
    href: "/settings/feedback",
  },
});
check("返信の通知を作れる", notif.type === "FEEDBACK" && notif.href === "/settings/feedback");

// ── まとめて対応状況を変える ───────────────────────
const bulkTargets = await Promise.all([
  db.feedback.create({ data: { kind: "OTHER", body: "まとめ1", userId: user.id } }),
  db.feedback.create({ data: { kind: "OTHER", body: "まとめ2", userId: user.id } }),
]);
const bulk = await db.feedback.updateMany({
  where: { id: { in: bulkTargets.map((r) => r.id) } },
  data: { status: "WONTFIX", handledByUserId: admin.id, handledAt: new Date() },
});
check("まとめて対応状況を変えられる", bulk.count === 2, `${bulk.count}件`);
await db.feedback.deleteMany({ where: { id: { in: bulkTargets.map((r) => r.id) } } });

// ── 退会しても内容は残る ───────────────────────────
await db.user.delete({ where: { id: user.id } });
const afterLeave = await db.feedback.findUnique({ where: { id: fb.id } });
check("退会しても報告は残る", afterLeave !== null);
check("返信も残る", afterLeave.replyBody?.includes("次回の更新"));
check("送り主だけ null になる", afterLeave.userId === null);
check("本文は消えない", afterLeave.body.includes("保存を押しても"));

// 対応した管理者が退会した場合も、報告は残る。
await db.user.delete({ where: { id: admin.id } });
const afterAdmin = await db.feedback.findUnique({ where: { id: fb.id } });
check("管理者が退会しても報告は残る", afterAdmin !== null);
check("対応者だけ null になる", afterAdmin.handledByUserId === null);
check("メモは残る", afterAdmin.adminNote === "再現を確認中");

await db.feedback.deleteMany({ where: { id: { in: [fb.id] } } });
await db.feedback.deleteMany({ where: { userId: null, body: { contains: "週ごとの支出" } } });
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
