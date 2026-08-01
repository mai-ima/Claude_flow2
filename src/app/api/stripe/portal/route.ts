import { NextResponse } from "next/server";
import { stripe, isStripeEnabled } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { API_MESSAGE } from "@/lib/api-messages";

export async function POST() {
  if (!isStripeEnabled || !stripe) {
    return NextResponse.json({ message: "現在ご利用いただけません。" }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: API_MESSAGE.UNAUTHORIZED }, { status: 401 });
  }
  // Stripe API を叩くため実行回数を制限する。
  const rl = await rateLimit(`portal:${user.id}`, 10, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { message: API_MESSAGE.RATE_LIMITED },
      { status: 429 },
    );
  }

  const billing = await db.billingProfile.findUnique({ where: { userId: user.id } });
  if (!billing?.stripeCustomerId) {
    return NextResponse.json({ message: "請求情報が見つかりません。" }, { status: 400 });
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: `${clientEnv.NEXT_PUBLIC_APP_URL}/settings`,
  });
  return NextResponse.json({ url: session.url });
}
