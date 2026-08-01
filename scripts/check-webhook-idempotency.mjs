// Stripe webhook の冪等化を、実際に同じ event.id を2回送って確認する。
// 署名が要るので STRIPE_WEBHOOK_SECRET を使って自前で署名を作る。
import { createHmac } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/index.js";

const BASE = process.env.BASE ?? "http://127.0.0.1:3127";
const SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test";
const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/tsumiki" } },
});

const results = [];
const check = (n, ok, d = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? " :: " + d : ""}`);
};

const tag = "wh-" + Date.now().toString().slice(-6);
const customerId = `cus_${tag}`;

const user = await db.user.create({
  data: {
    email: `${tag}@t.test`,
    billing: { create: { tier: "FREE", stripeCustomerId: customerId } },
  },
});

function sign(payload) {
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", SECRET).update(`${t}.${payload}`).digest("hex");
  return `t=${t},v1=${sig}`;
}

async function send(event) {
  const payload = JSON.stringify(event);
  const res = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": sign(payload) },
    body: payload,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const eventId = `evt_${tag}`;
const event = {
  id: eventId,
  type: "customer.subscription.created",
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: `sub_${tag}`,
      customer: customerId,
      status: "active",
      cancel_at_period_end: false,
      items: {
        data: [
          {
            price: { id: process.env.STRIPE_PRICE_PLUS_MONTHLY ?? "price_plus_monthly" },
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          },
        ],
      },
    },
  },
};

const first = await send(event);
check("1回目が受理される", first.status === 200, JSON.stringify(first.body));

const afterFirst = await db.billingProfile.findUnique({ where: { userId: user.id } });
check("プランが反映される", afterFirst?.tier !== "FREE", afterFirst?.tier);

const second = await send(event);
check("2回目も 200 を返す（Stripe に再送させない）", second.status === 200);
check("2回目は重複として扱われる", second.body?.duplicate === true, JSON.stringify(second.body));

const stored = await db.stripeEvent.count({ where: { id: eventId } });
check("イベント記録は1件だけ", stored === 1, `${stored}件`);

// 遅れて届いた古い更新で巻き戻らないこと
const stale = {
  ...event,
  id: `evt_${tag}_stale`,
  data: {
    object: {
      ...event.data.object,
      status: "canceled",
      items: {
        data: [
          {
            price: { id: "price_plus_monthly" },
            current_period_end: Math.floor(Date.now() / 1000) - 86400,
          },
        ],
      },
    },
  },
};
await send(stale);
const afterStale = await db.billingProfile.findUnique({ where: { userId: user.id } });
check("古いイベントで巻き戻らない", afterStale?.tier === afterFirst?.tier, `${afterFirst?.tier} → ${afterStale?.tier}`);

await db.user.delete({ where: { id: user.id } }).catch(() => {});
await db.stripeEvent.deleteMany({ where: { id: { startsWith: `evt_${tag}` } } });
await db.$disconnect();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
