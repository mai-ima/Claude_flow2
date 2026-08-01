import { NextResponse } from "next/server";
import { stripe, isStripeEnabled, priceIdFor } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { PlanTier } from "@/lib/enums";
import { API_MESSAGE } from "@/lib/api-messages";

export async function POST(req: Request) {
  if (!isStripeEnabled || !stripe) {
    return NextResponse.json(
      { message: "決済は現在準備中です。" },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: API_MESSAGE.UNAUTHORIZED }, { status: 401 });
  }

  // Stripe への顧客作成・セッション発行を伴うため、実行回数を制限する。
  const rl = await rateLimit(`checkout:${user.id}`, 10, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { message: API_MESSAGE.RATE_LIMITED },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const tierParse = PlanTier.safeParse(body.tier);
  const cycle = body.cycle === "monthly" ? "monthly" : "yearly";
  if (!tierParse.success || tierParse.data === "FREE") {
    return NextResponse.json({ message: "プランが不正です。" }, { status: 400 });
  }
  const tier = tierParse.data;

  const priceId = priceIdFor(tier, cycle);
  if (!priceId) {
    return NextResponse.json(
      { message: "このプランの価格が設定されていません。" },
      { status: 503 },
    );
  }

  // Stripe 顧客を用意
  let billing = await db.billingProfile.findUnique({ where: { userId: user.id } });
  let customerId = billing?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    billing = await db.billingProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, stripeCustomerId: customerId },
      update: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${clientEnv.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=1`,
    cancel_url: `${clientEnv.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { userId: user.id, tier },
    locale: "ja",
  });

  return NextResponse.json({ url: session.url });
}
