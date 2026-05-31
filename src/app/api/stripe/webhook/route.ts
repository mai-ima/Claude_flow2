import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, isStripeEnabled, tierFromPriceId } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

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
        const customerId = session.customer as string;
        const subId = session.subscription as string | null;
        const tier = session.metadata?.tier;
        if (customerId) {
          await db.billingProfile.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              tier: tier ?? "PLUS",
              stripeSubscriptionId: subId ?? undefined,
            },
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const priceId = sub.items.data[0]?.price.id;
        const tier = priceId ? tierFromPriceId(priceId) : null;
        const periodEnd = sub.items.data[0]?.current_period_end;
        await db.billingProfile.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            tier: sub.status === "active" || sub.status === "trialing" ? (tier ?? "PLUS") : "FREE",
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db.billingProfile.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: { tier: "FREE", stripeSubscriptionId: null, cancelAtPeriodEnd: false },
        });
        break;
      }
    }
  } catch (err) {
    console.error("[webhook] handler error", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
