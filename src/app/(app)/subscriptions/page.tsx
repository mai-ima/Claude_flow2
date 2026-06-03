import type { Metadata } from "next";
import { getAppContext } from "@/lib/app-context";
import { canUse } from "@/lib/plans";
import {
  listSubscriptions,
  subscriptionTotals,
  subscriptionsByPaymentMethod,
} from "@/modules/subscriptions/queries";
import { listCategories, listPaymentMethods } from "@/modules/transactions/queries";
import {
  detectWaste,
  wasteMessage,
  SubscriptionsClient,
  type SubItem,
  type StackGroup,
} from "@/modules/subscriptions";
import { PageHeader, PageContainer } from "@/components/app/page-header";
import { formatDate, daysUntil, daysSince, advanceRenewal } from "@/lib/date";
import { formatMoney, toMonthlyAmount, toYearlyAmount } from "@/lib/money";
import { CYCLE_LABEL, STATUS_LABEL, type BillingCycle } from "@/lib/enums";
import { findService } from "@/lib/service-catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "サブスク管理", noindex: true });

export default async function SubscriptionsPage() {
  const { ledgerId, canEdit, tier, currency } = await getAppContext();

  const [subs, totals, byPayment, categories, paymentMethods] = await Promise.all([
    listSubscriptions(ledgerId),
    subscriptionTotals(ledgerId),
    subscriptionsByPaymentMethod(ledgerId),
    listCategories(ledgerId),
    listPaymentMethods(ledgerId),
  ]);

  const items: SubItem[] = subs.map((s) => {
    const cycle = s.cycle as BillingCycle;
    const svc = findService(s.serviceKey);
    const wasteLevel = detectWaste(s.lastUsedAt, s.status);
    return {
      id: s.id,
      name: s.name,
      icon: s.category?.icon ?? svc?.icon ?? "repeat",
      monthly: toMonthlyAmount(s.amount, cycle),
      yearly: toYearlyAmount(s.amount, cycle),
      cycleLabel: CYCLE_LABEL[cycle],
      statusLabel: STATUS_LABEL[s.status as keyof typeof STATUS_LABEL],
      status: s.status,
      nextRenewalLabel: formatDate(s.nextRenewalAt, "M月d日"),
      daysUntil: daysUntil(s.nextRenewalAt),
      categoryName: s.category?.name ?? "未分類",
      paymentName: s.paymentMethod?.name ?? null,
      wasteLevel,
      wasteMessage: wasteMessage(s.lastUsedAt),
      daysSinceUsed: daysSince(s.lastUsedAt),
      cancelUrl: svc?.cancelUrl ?? null,
      cancelSteps: svc?.cancelSteps ?? [],
      edit: {
        id: s.id,
        name: s.name,
        amount: s.amount,
        cycle,
        status: s.status as SubItem["edit"]["status"],
        nextRenewalAt: s.nextRenewalAt.toISOString().slice(0, 10),
        categoryId: s.categoryId ?? "",
        paymentMethodId: s.paymentMethodId ?? "",
        reminderDaysBefore: s.reminderDaysBefore,
        autoPostTransaction: s.autoPostTransaction,
        serviceKey: s.serviceKey ?? "",
        notes: s.notes ?? "",
      },
    };
  });

  const groups: StackGroup[] = byPayment.groups.map((g) => ({
    name: g.method.name,
    color: g.method.color,
    monthly: g.monthly,
    subs: g.subs.map((s) => ({
      id: s.id,
      name: s.name,
      icon: findService(s.serviceKey)?.icon ?? "repeat",
      label: `${formatMoney(toMonthlyAmount(s.amount, s.cycle as BillingCycle))}/月`,
    })),
  }));
  const unassigned: StackGroup | null =
    byPayment.unassigned.length > 0
      ? {
          name: "未設定",
          color: "gray",
          monthly: byPayment.unassigned.reduce(
            (sum, s) => sum + toMonthlyAmount(s.amount, s.cycle as BillingCycle),
            0,
          ),
          subs: byPayment.unassigned.map((s) => ({
            id: s.id,
            name: s.name,
            icon: findService(s.serviceKey)?.icon ?? "repeat",
            label: `${formatMoney(toMonthlyAmount(s.amount, s.cycle as BillingCycle))}/月`,
          })),
        }
      : null;

  // 今後12ヶ月の支払い予定（各サブスクの更新をシミュレート）
  const calStart = new Date();
  calStart.setDate(1);
  calStart.setHours(0, 0, 0, 0);
  const calEnd = new Date(calStart.getFullYear(), calStart.getMonth() + 12, 1);
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(calStart.getFullYear(), calStart.getMonth() + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: formatDate(d, "yyyy年M月"), total: 0, count: 0 };
  });
  const bucketMap = new Map(buckets.map((b) => [b.key, b]));
  for (const s of subs) {
    if (s.status !== "ACTIVE" && s.status !== "TRIAL") continue;
    let next = new Date(s.nextRenewalAt);
    let guard = 0;
    while (next < calEnd && guard < 600) {
      if (next >= calStart) {
        const b = bucketMap.get(`${next.getFullYear()}-${next.getMonth()}`);
        if (b) {
          b.total += s.amount;
          b.count++;
        }
      }
      next = advanceRenewal(next, s.cycle as BillingCycle);
      guard++;
    }
  }
  const calendar = buckets.map((b) => ({ label: b.label, total: b.total, count: b.count }));

  return (
    <PageContainer>
      <PageHeader title="サブスク" subtitle="毎月の固定費を、ひと目で。" />
      <SubscriptionsClient
        items={items}
        stack={{ groups, unassigned }}
        totals={totals}
        calendar={calendar}
        currency={currency}
        categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
        paymentMethods={paymentMethods.map((p) => ({ id: p.id, name: p.name }))}
        canEdit={canEdit}
        isPro={tier === "PRO"}
        canUseReminders={canUse(tier, "reminders")}
      />
    </PageContainer>
  );
}
