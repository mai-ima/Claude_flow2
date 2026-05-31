import "server-only";
import Stripe from "stripe";
import { env, isStripeEnabled } from "./env";
import { PLANS } from "./plans";
import type { PlanTier } from "./enums";

export { isStripeEnabled };

/** キーがある時だけ Stripe クライアントを生成（無ければ null）。 */
export const stripe: Stripe | null = isStripeEnabled
  ? new Stripe(env.STRIPE_SECRET_KEY!)
  : null;

/** tier + cycle → Stripe price ID（env から）。未設定なら null。 */
export function priceIdFor(tier: PlanTier, cycle: "monthly" | "yearly"): string | null {
  const plan = PLANS[tier];
  const key = cycle === "monthly" ? plan.stripePriceMonthlyEnv : plan.stripePriceYearlyEnv;
  if (!key) return null;
  return (env as Record<string, string | undefined>)[key] ?? null;
}

/** Stripe price ID → tier の逆引き（webhook 用）。 */
export function tierFromPriceId(priceId: string): PlanTier | null {
  for (const tier of ["PLUS", "PRO"] as PlanTier[]) {
    if (
      priceIdFor(tier, "monthly") === priceId ||
      priceIdFor(tier, "yearly") === priceId
    ) {
      return tier;
    }
  }
  return null;
}
