import { z } from "zod";

/**
 * env を起動時に検証。実キーが無くてもアプリは完全動作するよう、
 * 収益化/メール/レート制限/監視 関連はすべて optional（env 差込み式）。
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1).default("postgresql://localhost:5432/tsumiki"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // 収益化（任意）
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PLUS_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PLUS_YEARLY: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
  // メール（任意・Resend REST）
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // レート制限（任意・Upstash REST）
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  // 監視（任意・Sentry）
  SENTRY_DSN: z.string().optional(),
  // OAuth（任意）
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // cron 保護 / デモ投入の本番許可
  CRON_SECRET: z.string().optional(),
  // デモ投入用。未設定なら CRON_SECRET にフォールバック（既存デプロイ互換）。
  // 用途ごとに鍵を分けたい場合はこちらを設定する。
  SEED_DEMO_SECRET: z.string().optional(),
  ALLOW_DEMO_SEED: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_ADSENSE_CLIENT: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

function parseEnv<T extends z.ZodType>(schema: T, raw: unknown, label: string): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = z
      .flattenError(result.error)
      .fieldErrors;
    console.error(`[env] ${label} の検証に失敗しました:`, issues);
    throw new Error(`環境変数(${label})が不正です。設定を確認してください。`);
  }
  return result.data;
}

/**
 * 本番で危険な既定値のまま起動していないか検査する。
 * DATABASE_URL はローカル用の既定値を持たせているため、
 * 設定漏れに気づかないまま本番が動いてしまうのを防ぐ。
 * （AUTH_SECRET は実装のどこからも参照されていない死んだ設定だったため削除した。
 *   セッションは randomBytes によるトークン方式で署名鍵を使わない。）
 */
function assertProductionSecrets(e: z.infer<typeof serverSchema>) {
  // このモジュールは clientEnv 経由でクライアントにも読み込まれる。
  // ブラウザには DATABASE_URL 等が渡らず既定値になるため、
  // サーバー以外では検査しない（検査するとページが丸ごと落ちる）。
  if (typeof window !== "undefined") return;
  if (e.NODE_ENV !== "production") return;
  // ビルド時は実行時の環境変数が入っていないのが正常なので検査しない
  // （ここで throw すると next build が落ちる）。
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const bad: string[] = [];
  // localhost のままの接続先は、本番では確実に設定漏れ。
  if (e.DATABASE_URL.includes("localhost")) bad.push("DATABASE_URL");
  if (bad.length > 0) {
    throw new Error(
      `本番環境で既定値のままの環境変数があります: ${bad.join(", ")}。値を設定してください。`,
    );
  }
}

export const env = parseEnv(
  serverSchema,
  {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_PLUS_MONTHLY: process.env.STRIPE_PRICE_PLUS_MONTHLY,
    STRIPE_PRICE_PLUS_YEARLY: process.env.STRIPE_PRICE_PLUS_YEARLY,
    STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
    STRIPE_PRICE_PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    SENTRY_DSN: process.env.SENTRY_DSN,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    SEED_DEMO_SECRET: process.env.SEED_DEMO_SECRET,
    ALLOW_DEMO_SEED: process.env.ALLOW_DEMO_SEED,
  },
  "server",
);

assertProductionSecrets(env);

export const clientEnv = parseEnv(
  clientSchema,
  {
    NEXT_PUBLIC_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  "client",
);

export const isStripeEnabled = Boolean(env.STRIPE_SECRET_KEY);
export const isEmailEnabled = Boolean(env.RESEND_API_KEY);
export const isAdsEnabled = Boolean(clientEnv.NEXT_PUBLIC_ADSENSE_CLIENT);
export const isRateLimitEnabled = Boolean(
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN,
);
export const isSentryEnabled = Boolean(env.SENTRY_DSN);
export const isGoogleAuthEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);
