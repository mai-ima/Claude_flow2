import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, isStripeEnabled, tierFromPriceId } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { PlanTier } from "@/lib/enums";
import { logger } from "@/lib/logger";

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
    logger.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  // 冪等化: Stripe は同じイベントを再送する（受信側が 2xx を返せなかった場合など）。
  // event.id を先に記録し、既にあれば処理しない。
  // 先に記録するのは、処理中の再送で二重に走らせないため。
  try {
    await db.stripeEvent.create({
      data: { id: event.id, type: event.type, payload: { created: event.created } },
    });
  } catch {
    // 一意制約に当たる = 処理済み。成功として返し、Stripe に再送を止めさせる。
    logger.info("[webhook] duplicate event ignored", { id: event.id, type: event.type });
    return NextResponse.json({ received: true, duplicate: true });
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
        // 遅れて届いた古いイベントで新しい状態を巻き戻さない。
        // 期間終了が現在の記録より古いものは無視する。
        const current = await db.billingProfile.findFirst({
          where: { stripeCustomerId: customerId },
          select: { currentPeriodEnd: true, stripeSubscriptionId: true },
        });
        if (
          ms &&
          current?.currentPeriodEnd &&
          current.stripeSubscriptionId === sub.id &&
          current.currentPeriodEnd.getTime() > ms
        ) {
          logger.info("[webhook] stale subscription event ignored", { id: event.id });
          break;
        }
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
        // 現在保持している契約と一致するときだけ FREE に落とす。
        // Webhook は順序が保証されないため、古い契約の deleted が
        // 新しい契約の created より後に届くと、課金中の利用者が
        // 無条件に FREE へ落ちてしまう。
        await db.billingProfile.updateMany({
          where: { stripeCustomerId: customerId, stripeSubscriptionId: sub.id },
          data: { tier: "FREE", stripeSubscriptionId: null, cancelAtPeriodEnd: false },
        });
        break;
      }
      case "invoice.payment_failed":
      case "customer.subscription.trial_will_end": {
        // 将来: 通知/メール送信のフック。現状はログのみ。
        logger.warn(`[webhook] ${event.type}`);
        break;
      }
    }
  } catch (err) {
    logger.error("[webhook] handler error", err, { id: event.id, type: event.type });
    // 処理に失敗したので記録を取り消す。残したままだと、Stripe の再送が
    // 「処理済み」と判定されて永久に反映されない。
    await db.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
