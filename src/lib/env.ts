import { z } from "zod";
import { resolveDatabaseUrl, FALLBACK_DATABASE_URL_KEYS } from "./database-url";

/**
 * 接続文字列は DATABASE_URL とは限らない（Vercel の連携は別名で発行する）。
 * 名前の違いだけでサイト全体が止まらないよう、入口で吸収する。
 */
const resolvedDb = resolveDatabaseUrl();

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
 *
 * ここで throw してはいけない。このモジュールはほぼ全てのページから読み込まれる
 * ため、モジュール評価中に投げるとログイン画面もヘルスチェックも道連れになり、
 * 画面には内容のない 500 だけが残る。原因を伝える手段が自分で潰れてしまう。
 *
 * 実際にそれで起きた事故: Vercel の Postgres 連携が DATABASE_URL ではなく
 * POSTGRES_PRISMA_URL を発行していたため既定値のまま起動し、静的な
 * マーケティングページ以外の全てが 500 になった。診断もできなかった。
 *
 * そこで、見つけた問題は投げずに記録する。接続できないこと自体は Prisma が
 * 返すので、ここは「なぜ繋がらないのか」を /api/health から読めるようにする役目に絞る。
 *
 * （AUTH_SECRET は実装のどこからも参照されていない死んだ設定だったため削除した。
 *   セッションは randomBytes によるトークン方式で署名鍵を使わない。）
 */
function findProductionProblems(e: z.infer<typeof serverSchema>): string[] {
  // このモジュールは clientEnv 経由でクライアントにも読み込まれる。
  // ブラウザには DATABASE_URL 等が渡らず既定値になるため、サーバー以外では検査しない。
  if (typeof window !== "undefined") return [];
  if (e.NODE_ENV !== "production") return [];
  // ビルド時は実行時の環境変数が入っていないのが正常なので検査しない。
  if (process.env.NEXT_PHASE === "phase-production-build") return [];

  const problems: string[] = [];
  if (e.DATABASE_URL.includes("localhost")) {
    problems.push(
      "DATABASE_URL が実行時に渡っていません（既定値のままです）。" +
        `Vercel の環境変数で DATABASE_URL、または ${FALLBACK_DATABASE_URL_KEYS.join(" / ")} ` +
        "のいずれかが Production に設定されているか確認してください。",
    );
  }
  return problems;
}

export const env = parseEnv(
  serverSchema,
  {
    DATABASE_URL: resolvedDb.url,
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
    CRON_SECRET: process.env.CRON_SECRET,
    SEED_DEMO_SECRET: process.env.SEED_DEMO_SECRET,
    ALLOW_DEMO_SEED: process.env.ALLOW_DEMO_SEED,
  },
  "server",
);

/**
 * 本番として明らかにおかしい設定の一覧。空なら問題なし。
 * /api/health がそのまま返すので、画面を触らずに原因を読める。
 */
export const envProblems: string[] = findProductionProblems(env);

/** 接続文字列をどの環境変数から採ったか。値は含めない。 */
export const databaseUrlSource: string | null = resolvedDb.source;

if (envProblems.length > 0) {
  // 起動時に一度だけ、はっきり残す。投げないぶん見落とさないようにする。
  console.error(
    JSON.stringify({ level: "error", message: "env misconfigured", problems: envProblems }),
  );
}

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
export const isRateLimitEnabled = Boolean(
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN,
);
export const isSentryEnabled = Boolean(env.SENTRY_DSN);
