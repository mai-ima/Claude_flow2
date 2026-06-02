import { scryptSync, randomBytes } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma";
import { DEFAULT_CATEGORIES } from "../src/lib/default-categories";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysAhead(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/** ユーザー + 個人帳簿 + 既定カテゴリを「無ければ作成」。返り値で新規かどうかを返す。 */
async function ensureUser(opts: {
  email: string;
  password: string;
  name: string;
  isAdmin?: boolean;
  tier?: "FREE" | "PLUS" | "PRO";
  wage?: number;
}): Promise<{ userId: string; ledgerId: string; created: boolean }> {
  const existing = await db.user.findUnique({ where: { email: opts.email } });
  if (existing) {
    const l = await db.ledger.findFirst({ where: { ownerId: existing.id, type: "PERSONAL" } });
    return { userId: existing.id, ledgerId: l?.id ?? "", created: false };
  }
  const user = await db.user.create({
    data: {
      email: opts.email,
      name: opts.name,
      isAdmin: opts.isAdmin ?? false,
      assumedHourlyWage: opts.wage ?? null,
      currency: "JPY",
      passwordHash: hashPassword(opts.password),
    },
  });
  await db.billingProfile.create({ data: { userId: user.id, tier: opts.tier ?? "FREE" } });
  const ledger = await db.ledger.create({
    data: {
      name: `${opts.name}の家計簿`,
      type: "PERSONAL",
      ownerId: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, ledgerId: ledger.id })),
  });
  return { userId: user.id, ledgerId: ledger.id, created: true };
}

async function seedDemoData(userId: string, ledgerId: string) {
  const cats = await db.category.findMany({ where: { ledgerId } });
  const cat = (name: string) => cats.find((c) => c.name === name)?.id ?? null;

  const card = await db.paymentMethod.create({
    data: { ledgerId, name: "楽天カード", type: "CARD", color: "pink", icon: "card" },
  });
  const bank = await db.paymentMethod.create({
    data: { ledgerId, name: "三井住友銀行", type: "BANK", color: "green", icon: "card" },
  });

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
  await db.transaction.createMany({
    data: txns.map((t) => ({ ...t, ledgerId, createdByUserId: userId })),
  });

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
      data: {
        ledgerId,
        ownerUserId: userId,
        name: s.name,
        amount: s.amount,
        cycle: s.cycle,
        status: "ACTIVE",
        nextRenewalAt: s.nextRenewalAt,
        categoryId: cat("サブスク"),
        paymentMethodId: card.id,
        serviceKey: s.serviceKey,
        lastUsedAt: s.lastUsedAt,
        autoPostTransaction: true,
      },
    });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  await db.budget.create({
    data: { ledgerId, isTotalBudget: true, period: "MONTHLY", amount: 250000, startMonth: monthStart },
  });
  await db.goal.createMany({
    data: [
      { ledgerId, name: "沖縄旅行", targetAmount: 200000, currentAmount: 84000, color: "teal", deadline: daysAhead(120) },
      { ledgerId, name: "新しい iPhone", targetAmount: 150000, currentAmount: 45000, color: "blue", deadline: daysAhead(200) },
    ],
  });
  await db.notification.createMany({
    data: [
      { userId, type: "RENEWAL", title: "サブスクの更新が近づいています", body: "Netflix はあと3日で更新されます。", href: "/subscriptions" },
      { userId, type: "WASTE", title: "見直しのヒント", body: "Adobe Creative Cloud をしばらく利用していません。", href: "/subscriptions" },
    ],
  });
}

async function main() {
  // 管理者アカウント（無ければ作成）
  await ensureUser({ email: "admin@tsumiki.app", password: "admin1234", name: "管理者", isAdmin: true, tier: "PRO" });
  await ensureUser({ email: "staff@tsumiki.app", password: "staff1234", name: "管理者（動作確認用）", isAdmin: true, tier: "PLUS" });

  // デモ（無ければ作成 + サンプルデータ）
  const demo = await ensureUser({ email: "demo@tsumiki.app", password: "demo1234", name: "山田 太郎", tier: "PRO", wage: 2000 });
  if (demo.created) {
    await seedDemoData(demo.userId, demo.ledgerId);
    console.log("Seeded demo data.");
  } else {
    console.log("Demo already exists; skipped data.");
  }
  console.log("Accounts ready: demo@ / admin@ / staff@");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
