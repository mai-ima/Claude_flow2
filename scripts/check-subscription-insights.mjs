// サブスクの判断材料まわりを実データで確かめる。
// 見ているのは「保存した値が戻ってくるか」と「棚卸し通知が繰り返されないか」。
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

const REVIEW_INTERVAL_DAYS = 90;
const day = 86_400_000;
const tag = "ins-" + Date.now().toString().slice(-6);
const now = new Date();

const owner = await db.user.create({
  data: { email: `${tag}@t.test`, name: "オーナー", emailVerified: new Date() },
});
const ledger = await db.ledger.create({
  data: {
    name: `${tag} 帳簿`,
    type: "SOLO",
    ownerId: owner.id,
    members: { create: { userId: owner.id, role: "OWNER" } },
  },
});

// ── 開始日と見直し日の往復 ─────────────────────────────
const started = new Date(now.getFullYear() - 2, now.getMonth() - 3, 15);
const sub = await db.subscription.create({
  data: {
    ledgerId: ledger.id,
    ownerUserId: owner.id,
    name: "検証用サブスク",
    amount: 1490,
    cycle: "MONTHLY",
    status: "ACTIVE",
    nextRenewalAt: new Date(now.getTime() + 10 * day),
    startedAt: started,
  },
});
check("使い始めた日が保存される", sub.startedAt?.getTime() === started.getTime());
check("未見直しは null で入る", sub.lastReviewedAt === null);

// insights.ts の usagePeriod と同じ数え方（日をまたいでいない月は数えない）。
const months =
  (now.getFullYear() - started.getFullYear()) * 12 +
  (now.getMonth() - started.getMonth()) -
  (now.getDate() < started.getDate() ? 1 : 0);
check("経過月数が2年超で数えられる", months >= 24, `${months}ヶ月`);

await db.subscription.update({
  where: { id: sub.id },
  data: { lastReviewedAt: now },
});
const reviewed = await db.subscription.findUnique({ where: { id: sub.id } });
check("見直した日が記録される", reviewed?.lastReviewedAt !== null);

// ── 見直し判定 ────────────────────────────────────────
const needsReview = (last) =>
  last === null || Math.floor((now.getTime() - last.getTime()) / day) >= REVIEW_INTERVAL_DAYS;
check("見直し直後は対象外", needsReview(reviewed.lastReviewedAt) === false);
check(
  "90日たつと対象になる",
  needsReview(new Date(now.getTime() - 91 * day)) === true,
);
check("一度も見直していなければ対象", needsReview(null) === true);

// ── 価格改定の履歴 ────────────────────────────────────
await db.subscriptionPriceChange.createMany({
  data: [
    { subscriptionId: sub.id, oldAmount: 1200, newAmount: 1490, changedAt: new Date(now.getTime() - 40 * day) },
    { subscriptionId: sub.id, oldAmount: 990, newAmount: 1200, changedAt: new Date(now.getTime() - 400 * day) },
  ],
});
const changes = await db.subscriptionPriceChange.findMany({
  where: { subscription: { ledgerId: ledger.id } },
  orderBy: { changedAt: "desc" },
});
check("帳簿単位で改定履歴を引ける", changes.length === 2, `${changes.length}件`);
check("新しい順に並ぶ", changes[0].oldAmount === 1200);

// 他人の帳簿の改定が混ざらないこと。
const other = await db.user.create({
  data: { email: `${tag}-x@t.test`, name: "別の人", emailVerified: new Date() },
});
const otherLedger = await db.ledger.create({
  data: {
    name: `${tag} 別帳簿`,
    type: "SOLO",
    ownerId: other.id,
    members: { create: { userId: other.id, role: "OWNER" } },
  },
});
const otherSub = await db.subscription.create({
  data: {
    ledgerId: otherLedger.id,
    ownerUserId: other.id,
    name: "他人のサブスク",
    amount: 5000,
    cycle: "MONTHLY",
    status: "ACTIVE",
    nextRenewalAt: new Date(now.getTime() + 5 * day),
  },
});
await db.subscriptionPriceChange.create({
  data: { subscriptionId: otherSub.id, oldAmount: 4000, newAmount: 5000 },
});
const mine = await db.subscriptionPriceChange.findMany({
  where: { subscription: { ledgerId: ledger.id } },
});
check("他の帳簿の改定は混ざらない", mine.length === 2, `${mine.length}件`);

// ── 棚卸し通知の重複抑止 ──────────────────────────────
// createNotificationsOnce と同じ判定（userId + href が期間内にあれば作らない）。
const href = "/subscriptions?review=1";
async function createOnce(when) {
  const since = new Date(when.getTime() - REVIEW_INTERVAL_DAYS * day);
  const recent = await db.notification.findFirst({
    where: { userId: owner.id, type: "REVIEW", href, createdAt: { gte: since } },
  });
  if (recent) return 0;
  await db.notification.create({
    data: {
      userId: owner.id,
      ledgerId: ledger.id,
      type: "REVIEW",
      title: "サブスクの見直し時期です",
      body: "1件が、最後の見直しから90日以上たっています。",
      href,
    },
  });
  return 1;
}
check("棚卸し通知を作れる", (await createOnce(now)) === 1);
check("同じ期間内では作り直さない", (await createOnce(now)) === 0);
check(
  "期間を過ぎればまた知らせる",
  (await createOnce(new Date(now.getTime() + (REVIEW_INTERVAL_DAYS + 1) * day))) === 1,
);
const notifs = await db.notification.count({ where: { userId: owner.id, type: "REVIEW" } });
check("通知は2件だけ", notifs === 2, `${notifs}件`);

// ── 後始末（サブスクを消すと改定履歴も消える） ────────
await db.subscription.delete({ where: { id: sub.id } });
const left = await db.subscriptionPriceChange.count({ where: { subscriptionId: sub.id } });
check("サブスクを消すと改定履歴も残らない", left === 0, `${left}件`);

await db.ledger.deleteMany({ where: { id: { in: [ledger.id, otherLedger.id] } } });
await db.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
