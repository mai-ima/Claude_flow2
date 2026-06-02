import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, isStripeEnabled, tierFromPriceId } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { PlanTier } from "@/lib/enums";

/** metadata.tier を安全に PlanTier へ。不正値は null。 */
function safeTier(value: unknown): "FREE" | "PLUS" | "PRO" | null {
  const r = PlanTier.safeParse(value);
  return r.success ? r.data : null;
}

/** Stripe Subscription から期間終了(ms)を安全に取得（API 版差異に耐性）。 */
function periodEndMs(sub: Stripe.Subscription): number | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const fromItem = item?.current_period_end;
  const fromSub = (sub as unknown as { current_period_end?: number }).current_period_end;
  const sec = fromItem ?? fromSub;
  return typeof sec === "number" && sec > 0 ? sec * 1000 : null;
}

export async function POST(req: Request) {
  if (!isStripeEnabled || !stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ received: false }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === "string" ? session.customer : null;
        const subId = typeof session.subscription === "string" ? session.subscription : null;
        const tier = safeTier(session.metadata?.tier) ?? "PLUS";
        if (customerId) {
          await db.billingProfile.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              tier,
              stripeSubscriptionId: subId ?? undefined,
            },
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        if (!customerId) break;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const tier = priceId ? tierFromPriceId(priceId) : null;
        const ms = periodEndMs(sub);
        const active = sub.status === "active" || sub.status === "trialing";
        await db.billingProfile.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            tier: active ? (tier ?? "PLUS") : "FREE",
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: ms ? new Date(ms) : undefined,
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          },
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        if (!customerId) break;
        await db.billingProfile.updateMany({
          where: { stripeCustomerId: customerId },
          data: { tier: "FREE", stripeSubscriptionId: null, cancelAtPeriodEnd: false },
        });
        break;
      }
      case "invoice.payment_failed":
      case "customer.subscription.trial_will_end": {
        // 将来: 通知/メール送信のフック。現状はログのみ。
        console.warn(`[webhook] ${event.type}`);
        break;
      }
    }
  } catch (err) {
    console.error("[webhook] handler error", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
