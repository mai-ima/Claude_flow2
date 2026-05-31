import { NextResponse } from "next/server";
import { stripe, isStripeEnabled } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientEnv } from "@/lib/env";

export async function POST() {
  if (!isStripeEnabled || !stripe) {
    return NextResponse.json({ message: "現在ご利用いただけません。" }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
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
