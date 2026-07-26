// アカウント自動投入（tsx 不要・素の Node）。デプロイ時に実行。
// 冪等: 無ければ作成・既存は維持。エラーでもビルドを止めない（exit 0）。
import { scryptSync, randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("../src/generated/prisma/index.js");
const db = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: "食費", type: "EXPENSE", icon: "food", color: "orange" },
  { name: "日用品", type: "EXPENSE", icon: "cart", color: "teal" },
  { name: "住居", type: "EXPENSE", icon: "home", color: "indigo" },
  { name: "水道・光熱", type: "EXPENSE", icon: "bolt", color: "yellow" },
  { name: "交通", type: "EXPENSE", icon: "train", color: "blue" },
  { name: "通信", type: "EXPENSE", icon: "wifi", color: "cyan" },
  { name: "娯楽", type: "EXPENSE", icon: "play", color: "pink" },
  { name: "医療・健康", type: "EXPENSE", icon: "heart", color: "red" },
  { name: "サブスク", type: "EXPENSE", icon: "repeat", color: "purple" },
  { name: "その他", type: "EXPENSE", icon: "tag", color: "gray" },
  { name: "給与", type: "INCOME", icon: "wallet", color: "green" },
  { name: "賞与", type: "INCOME", icon: "gift", color: "mint" },
  { name: "副業", type: "INCOME", icon: "briefcase", color: "blue" },
  { name: "その他収入", type: "INCOME", icon: "plus", color: "gray" },
];

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysAhead = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

async function ensureUser({ email, password, name, isAdmin = false, tier = "FREE", wage = null }) {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    const l = await db.ledger.findFirst({ where: { ownerId: existing.id, type: "PERSONAL" } });
    return { userId: existing.id, ledgerId: l?.id ?? null, created: false };
  }
  const user = await db.user.create({
    data: { email, name, isAdmin, assumedHourlyWage: wage, currency: "JPY", passwordHash: hashPassword(password) },
  });
  await db.billingProfile.create({ data: { userId: user.id, tier } });
  const ledger = await db.ledger.create({
    data: { name: `${name}の家計簿`, type: "PERSONAL", ownerId: user.id, members: { create: { userId: user.id, role: "OWNER" } } },
  });
  await db.category.createMany({ data: DEFAULT_CATEGORIES.map((c) => ({ ...c, ledgerId: ledger.id })) });
  return { userId: user.id, ledgerId: ledger.id, created: true };
}

async function seedDemoData(userId, ledgerId) {
  const cats = await db.category.findMany({ where: { ledgerId } });
  const cat = (n) => cats.find((c) => c.name === n)?.id ?? null;
  const card = await db.paymentMethod.create({ data: { ledgerId, name: "楽天カード", type: "CARD", color: "pink", icon: "card" } });
  const bank = await db.paymentMethod.create({ data: { ledgerId, name: "三井住友銀行", type: "BANK", color: "green", icon: "card" } });
  const txns = [
    { type: "INCOME", amount: 320000, occurredAt: daysAgo(5), categoryId: cat("給与"), paymentMethodId: bank.id, memo: "今月の給与" },
    { type: "EXPENSE", amount: 3280, occurredAt: daysAgo(1), categoryId: cat("食費"), paymentMethodId: card.id, memo: "スーパー" },
    { type: "EXPENSE", amount: 1200, occurredAt: daysAgo(2), categoryId: cat("食費"), paymentMethodId: card.id, memo: "ランチ" },
    { type: "EXPENSE", amount: 8500, occurredAt: daysAgo(3), categoryId: cat("日用品"), paymentMethodId: card.id, memo: null },
    { type: "EXPENSE", amount: 85000, occurredAt: daysAgo(4), categoryId: cat("住居"), paymentMethodId: bank.id, memo: "家賃" },
    { type: "EXPENSE", amount: 6800, occurredAt: daysAgo(6), categoryId: cat("水道・光熱"), paymentMethodId: bank.id, memo: null },
    { type: "EXPENSE", amount: 4400, occurredAt: daysAgo(7), categoryId: cat("通信"), paymentMethodId: card.id, memo: null },
    { type: "EXPENSE", amount: 12000, occurredAt: daysAgo(9), categoryId: cat("娯楽"), paymentMethodId: card.id, memo: "ライブ" },
    { type: "INCOME", amount: 45000, occurredAt: daysAgo(18), categoryId: cat("副業"), paymentMethodId: bank.id, memo: "受託案件" },
    { type: "INCOME", amount: 320000, occurredAt: daysAgo(35), categoryId: cat("給与"), paymentMethodId: bank.id, memo: null },
    { type: "EXPENSE", amount: 85000, occurredAt: daysAgo(34), categoryId: cat("住居"), paymentMethodId: bank.id, memo: "家賃" },
    { type: "EXPENSE", amount: 42000, occurredAt: daysAgo(33), categoryId: cat("食費"), paymentMethodId: card.id, memo: null },
  ];
  await db.transaction.createMany({ data: txns.map((t) => ({ ...t, ledgerId, createdByUserId: userId })) });
  const subs = [
    { name: "Netflix", amount: 1490, cycle: "MONTHLY", serviceKey: "netflix", lastUsedAt: daysAgo(2), nextRenewalAt: daysAhead(3) },
    { name: "Spotify", amount: 980, cycle: "MONTHLY", serviceKey: "spotify", lastUsedAt: daysAgo(1), nextRenewalAt: daysAhead(12) },
    { name: "Amazon Prime", amount: 5900, cycle: "YEARLY", serviceKey: "amazon-prime", lastUsedAt: daysAgo(20), nextRenewalAt: daysAhead(120) },
    { name: "iCloud+", amount: 130, cycle: "MONTHLY", serviceKey: "icloud", lastUsedAt: daysAgo(0), nextRenewalAt: daysAhead(8) },
    { name: "Adobe Creative Cloud", amount: 6480, cycle: "MONTHLY", serviceKey: "adobe-cc", lastUsedAt: daysAgo(110), nextRenewalAt: daysAhead(20) },
    { name: "ChatGPT Plus", amount: 3000, cycle: "MONTHLY", serviceKey: "chatgpt", lastUsedAt: daysAgo(95), nextRenewalAt: daysAhead(15) },
  ];
  for (const s of subs) {
    await db.subscription.create({
      data: { ledgerId, ownerUserId: userId, name: s.name, amount: s.amount, cycle: s.cycle, status: "ACTIVE", nextRenewalAt: s.nextRenewalAt, categoryId: cat("サブスク"), paymentMethodId: card.id, serviceKey: s.serviceKey, lastUsedAt: s.lastUsedAt, autoPostTransaction: true },
    });
  }
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  await db.budget.create({ data: { ledgerId, isTotalBudget: true, period: "MONTHLY", amount: 250000, startMonth: monthStart } });
  await db.goal.createMany({ data: [
    { ledgerId, name: "沖縄旅行", targetAmount: 200000, currentAmount: 84000, color: "teal", deadline: daysAhead(120) },
    { ledgerId, name: "新しい iPhone", targetAmount: 150000, currentAmount: 45000, color: "blue", deadline: daysAhead(200) },
  ] });
  await db.notification.createMany({ data: [
    { userId, type: "RENEWAL", title: "サブスクの更新が近づいています", body: "Netflix はあと3日で更新されます。", href: "/subscriptions" },
    { userId, type: "WASTE", title: "見直しのヒント", body: "Adobe Creative Cloud をしばらく利用していません。", href: "/subscriptions" },
  ] });
}

async function main() {
  // 管理者アカウントは、環境変数で資格情報を明示したときだけ作成する。
  // 以前は admin1234 / staff1234 を毎デプロイで投入しており、
  // 公開URLと固定パスワードだけで管理画面に入れる状態だった。
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) {
      console.warn("[seed] ADMIN_PASSWORD が短すぎます（12文字以上）。管理者の作成をスキップします。");
    } else {
      await ensureUser({
        email: adminEmail,
        password: adminPassword,
        name: "管理者",
        isAdmin: true,
        tier: "PRO",
      });
      console.log("[seed] admin ready:", adminEmail);
    }
  } else {
    console.log("[seed] ADMIN_EMAIL / ADMIN_PASSWORD 未設定のため管理者は作成しません。");
  }

  // デモアカウントは本番では既定で作らない（作る場合は SEED_DEMO=1）。
  const wantDemo = process.env.SEED_DEMO === "1" || process.env.NODE_ENV !== "production";
  if (!wantDemo) {
    console.log("[seed] デモアカウントは作成しません（SEED_DEMO=1 で有効化）。");
    return;
  }
  const demoPassword = process.env.DEMO_PASSWORD || "demo1234";
  const demo = await ensureUser({
    email: "demo@tsumiki.app",
    password: demoPassword,
    name: "山田 太郎",
    tier: "PRO",
    wage: 2000,
  });
  if (demo.created && demo.ledgerId) {
    await seedDemoData(demo.userId, demo.ledgerId);
    console.log("[seed] demo data created");
  } else {
    console.log("[seed] demo already exists; data skipped");
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error("[seed] failed (non-fatal):", e?.message ?? e);
    await db.$disconnect().catch(() => {});
    // ビルドを止めない
    process.exit(0);
  });
