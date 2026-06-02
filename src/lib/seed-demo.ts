import "server-only";
import { db } from "./db";
import { hashPassword } from "./password";
import { DEFAULT_CATEGORIES } from "./default-categories";

export const DEMO_EMAIL = "demo@tsumiki.app";
export const DEMO_PASSWORD = "demo1234";

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

/** デモアカウント（山田太郎）のデータを作り直す。べき等。 */
export async function seedDemo() {
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await db.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "山田 太郎",
      assumedHourlyWage: 2000,
      currency: "JPY",
      passwordHash: hashPassword(DEMO_PASSWORD),
    },
  });
  await db.billingProfile.create({ data: { userId: user.id, tier: "PRO" } });

  const ledger = await db.ledger.create({
    data: {
      name: "山田 太郎の家計簿",
      type: "PERSONAL",
      ownerId: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, ledgerId: ledger.id })),
  });
  const cats = await db.category.findMany({ where: { ledgerId: ledger.id } });
  const cat = (name: string) => cats.find((c) => c.name === name)?.id ?? null;

  const card = await db.paymentMethod.create({
    data: { ledgerId: ledger.id, name: "楽天カード", type: "CARD", color: "pink", icon: "card" },
  });
  const bank = await db.paymentMethod.create({
    data: { ledgerId: ledger.id, name: "三井住友銀行", type: "BANK", color: "green", icon: "card" },
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
    { type: "EXPENSE", amount: 2300, occurredAt: daysAgo(12), categoryId: cat("交通"), paymentMethodId: card.id, memo: null },
    { type: "EXPENSE", amount: 5600, occurredAt: daysAgo(15), categoryId: cat("医療・健康"), paymentMethodId: card.id, memo: null },
    { type: "INCOME", amount: 45000, occurredAt: daysAgo(18), categoryId: cat("副業"), paymentMethodId: bank.id, memo: "受託案件" },
    { type: "INCOME", amount: 320000, occurredAt: daysAgo(35), categoryId: cat("給与"), paymentMethodId: bank.id, memo: null },
    { type: "EXPENSE", amount: 85000, occurredAt: daysAgo(34), categoryId: cat("住居"), paymentMethodId: bank.id, memo: "家賃" },
    { type: "EXPENSE", amount: 42000, occurredAt: daysAgo(33), categoryId: cat("食費"), paymentMethodId: card.id, memo: null },
    { type: "EXPENSE", amount: 18000, occurredAt: daysAgo(30), categoryId: cat("娯楽"), paymentMethodId: card.id, memo: null },
  ];
  await db.transaction.createMany({
    data: txns.map((t) => ({ ...t, ledgerId: ledger.id, createdByUserId: user.id })),
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
        ledgerId: ledger.id,
        ownerUserId: user.id,
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
    data: { ledgerId: ledger.id, isTotalBudget: true, period: "MONTHLY", amount: 250000, startMonth: monthStart },
  });

  // 貯金目標のサンプル
  await db.goal.createMany({
    data: [
      { ledgerId: ledger.id, name: "沖縄旅行", targetAmount: 200000, currentAmount: 84000, color: "teal", deadline: daysAhead(120) },
      { ledgerId: ledger.id, name: "新しい iPhone", targetAmount: 150000, currentAmount: 45000, color: "blue", deadline: daysAhead(200) },
    ],
  });

  // アプリ内通知のサンプル
  await db.notification.createMany({
    data: [
      { userId: user.id, type: "RENEWAL", title: "サブスクの更新が近づいています", body: "Netflix はあと3日で更新されます。", href: "/subscriptions" },
      { userId: user.id, type: "WASTE", title: "見直しのヒント", body: "Adobe Creative Cloud をしばらく利用していません。", href: "/subscriptions" },
      { userId: user.id, type: "SUMMARY", title: "今月のサマリー", body: "今月の支出は ¥184,200。予算の74%です。", href: "/reports", readAt: new Date() },
    ],
  });

  return { email: DEMO_EMAIL, password: DEMO_PASSWORD };
}
