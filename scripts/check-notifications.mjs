// 追加した5種類の通知が、実際のデータから作られることを確認する。
// 各条件を満たすデータを用意 → cron を叩く → 通知が1件ずつ増えることを見る。
import { PrismaClient } from "../src/generated/prisma/index.js";

const url = process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/tsumiki";
const BASE = process.env.BASE ?? "http://127.0.0.1:3120";
const SECRET = process.env.CRON_SECRET ?? "test-cron-secret";
const db = new PrismaClient({ datasources: { db: { url } } });

const tag = "notif-" + Date.now().toString().slice(-6);
const results = [];
const check = (n, ok, d = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? " :: " + d : ""}`);
};

const day = 24 * 60 * 60 * 1000;
const now = new Date();

const user = await db.user.create({ data: { email: `${tag}@t.test`, name: "通知テスト" } });
const ledger = await db.ledger.create({
  data: {
    name: `${tag} 帳簿`,
    type: "PERSONAL",
    ownerId: user.id,
    members: { create: { userId: user.id, role: "OWNER" } },
  },
});

// WASTE: 120日使われていないサブスク
const stale = await db.subscription.create({
  data: {
    ledgerId: ledger.id, ownerUserId: user.id, name: `${tag} 放置サブスク`,
    amount: 1480, status: "ACTIVE",
    nextRenewalAt: new Date(now.getTime() + 20 * day),
    lastUsedAt: new Date(now.getTime() - 120 * day),
  },
});

// PRICE_CHANGE: 3日前に値上げ
const raised = await db.subscription.create({
  data: {
    ledgerId: ledger.id, ownerUserId: user.id, name: `${tag} 値上げサブスク`,
    amount: 1890, status: "ACTIVE",
    nextRenewalAt: new Date(now.getTime() + 20 * day),
  },
});
await db.subscriptionPriceChange.create({
  data: { subscriptionId: raised.id, oldAmount: 1490, newAmount: 1890,
          changedAt: new Date(now.getTime() - 3 * day) },
});

// GOAL: 達成済み / 期日が近い
await db.goal.create({
  data: { ledgerId: ledger.id, name: `${tag} 達成した目標`, targetAmount: 50000, currentAmount: 50000 },
});
await db.goal.create({
  data: { ledgerId: ledger.id, name: `${tag} 期日が近い目標`, targetAmount: 100000,
          currentAmount: 40000, deadline: new Date(now.getTime() + 10 * day) },
});

// RECURRING: 直近24時間に自動記帳された取引
const rec = await db.recurringTransaction.create({
  data: { ledgerId: ledger.id, createdByUserId: user.id, type: "EXPENSE",
          amount: 3000, nextRunAt: new Date(now.getTime() + 30 * day) },
});
await db.transaction.create({
  data: { ledgerId: ledger.id, createdByUserId: user.id, type: "EXPENSE", amount: 3000,
          occurredAt: now, recurringTransactionId: rec.id },
});

const before = await db.notification.groupBy({
  by: ["type"], where: { userId: user.id }, _count: { _all: true },
});
console.log("before:", JSON.stringify(before));

const headers = { authorization: `Bearer ${SECRET}` };
const res = await fetch(`${BASE}/api/cron/reminders`, { method: "POST", headers });
const body = await res.json();
console.log("cron:", res.status, JSON.stringify(body));

const after = await db.notification.findMany({
  where: { userId: user.id },
  select: { type: true, title: true, body: true, href: true },
});
const byType = new Map();
for (const n of after) byType.set(n.type, [...(byType.get(n.type) ?? []), n]);

for (const t of ["WASTE", "PRICE_CHANGE", "GOAL", "RECURRING"]) {
  const rows = byType.get(t) ?? [];
  check(`${t} が作られる`, rows.length > 0, rows[0]?.body ?? "なし");
}

// 根拠の数値が本文に入っていること（設計原則1）
const waste = (byType.get("WASTE") ?? [])[0];
check("WASTE に経過日数が入る", !!waste && /\d+日間 利用記録がありません/.test(waste.body), waste?.body ?? "");
const price = (byType.get("PRICE_CHANGE") ?? [])[0];
check("PRICE_CHANGE に前後の金額と率が入る",
  !!price && price.body.includes("￥1,490") && price.body.includes("￥1,890") && price.body.includes("+26.8%"),
  price?.body ?? "");
const goals = byType.get("GOAL") ?? [];
check("GOAL に達成と期日の2種が出る", goals.length === 2, goals.map((g) => g.title).join(" / "));

// 冪等性: もう一度叩いても増えない
const countBefore = after.length;
await fetch(`${BASE}/api/cron/reminders`, { method: "POST", headers });
const countAfter = await db.notification.count({ where: { userId: user.id } });
check("再実行しても通知が増えない", countAfter === countBefore, `${countBefore} → ${countAfter}`);

// 後片付け
await db.user.delete({ where: { id: user.id } }).catch(() => {});
await db.subscription.deleteMany({ where: { id: { in: [stale.id, raised.id] } } }).catch(() => {});
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
