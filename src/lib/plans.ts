import type { PlanTier } from "./enums";

export interface PlanFeature {
  label: string;
  /** この機能を含む最低 tier */
  tier: PlanTier;
}

export interface Plan {
  tier: PlanTier;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  /** Stripe price ID（env から注入。無ければ undefined＝課金は no-op） */
  stripePriceMonthlyEnv?: string;
  stripePriceYearlyEnv?: string;
  highlights: string[];
  /** サブスク登録上限（null=無制限） */
  maxSubscriptions: number | null;
  /** ファミリー共有の人数上限 */
  maxMembers: number;
  featured?: boolean;
}

export const PLANS: Record<PlanTier, Plan> = {
  FREE: {
    tier: "FREE",
    name: "フリー",
    tagline: "まずは気軽に、家計とサブスクの全体像を。",
    monthly: 0,
    yearly: 0,
    highlights: [
      "収支記録は無制限",
      "カレンダー表示と8つの切り口の分析",
      "サブスク5件＋値上げ検知",
      "コストタイム・家計の健康度",
    ],
    maxSubscriptions: 5,
    maxMembers: 1,
  },
  PLUS: {
    tier: "PLUS",
    name: "プラス",
    tagline: "サブスクを使いこなし、固定費を整える。",
    monthly: 480,
    yearly: 4800,
    stripePriceMonthlyEnv: "STRIPE_PRICE_PLUS_MONTHLY",
    stripePriceYearlyEnv: "STRIPE_PRICE_PLUS_YEARLY",
    highlights: [
      "サブスク無制限",
      "予算管理・超過アラート",
      "貯金目標・自動積立",
      "更新リマインダー",
      "ファミリー共有（最大2人）と精算",
      "広告非表示",
    ],
    maxSubscriptions: null,
    maxMembers: 2,
    featured: true,
  },
  PRO: {
    tier: "PRO",
    name: "プロ",
    tagline: "家計の最適化を、いちばん上の体験で。",
    monthly: 980,
    yearly: 9800,
    stripePriceMonthlyEnv: "STRIPE_PRICE_PRO_MONTHLY",
    stripePriceYearlyEnv: "STRIPE_PRICE_PRO_YEARLY",
    highlights: [
      "サブスク・レビュー",
      "ファミリー共有（最大5人）と精算",
      "CSV の書き出し",
      "CSV の取り込み",
    ],
    maxSubscriptions: null,
    maxMembers: 5,
  },
};

export const PLAN_LIST: Plan[] = [PLANS.FREE, PLANS.PLUS, PLANS.PRO];

const TIER_RANK: Record<PlanTier, number> = { FREE: 0, PLUS: 1, PRO: 2 };

export function tierAtLeast(tier: PlanTier, required: PlanTier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[required];
}

/** 機能フラグ。tier に応じて利用可否を返す。 */
export const FEATURES = {
  budgets: "PLUS",
  reminders: "PLUS",
  subscriptionStack: "PLUS",
  familySharing: "PLUS",
  hideAds: "PLUS",
  goals: "PLUS",
  summaryEmail: "PLUS",
  subscriptionReview: "PRO",
  cancelAssist: "PRO",
  advancedAnalytics: "PRO",
  csvExport: "PRO",
  csvImport: "PRO",
} as const satisfies Record<string, PlanTier>;

export type FeatureKey = keyof typeof FEATURES;

export function canUse(tier: PlanTier, feature: FeatureKey): boolean {
  return tierAtLeast(tier, FEATURES[feature]);
}
