import { z } from "zod";

/**
 * env を起動時に検証。実キーが無くてもアプリは完全動作するよう、
 * 収益化/メール関連はすべて optional。
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  AUTH_SECRET: z.string().min(1).default("dev-insecure-secret-change-me"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // 収益化（任意）
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PLUS_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PLUS_YEARLY: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
  // メール（任意）
  RESEND_API_KEY: z.string().optional(),
  // OAuth（任意）
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // cron 保護
  CRON_SECRET: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_ADSENSE_CLIENT: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

export const env = serverSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_PLUS_MONTHLY: process.env.STRIPE_PRICE_PLUS_MONTHLY,
  STRIPE_PRICE_PLUS_YEARLY: process.env.STRIPE_PRICE_PLUS_YEARLY,
  STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
  STRIPE_PRICE_PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const isStripeEnabled = Boolean(env.STRIPE_SECRET_KEY);
export const isEmailEnabled = Boolean(env.RESEND_API_KEY);
export const isAdsEnabled = Boolean(clientEnv.NEXT_PUBLIC_ADSENSE_CLIENT);
export const isGoogleAuthEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);
