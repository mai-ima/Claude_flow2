import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  isStripeEnabled,
  isEmailEnabled,
  isRateLimitEnabled,
} from "@/lib/env";
import { logger } from "@/lib/logger";
import { isSentryActive } from "@/lib/logger";

// DB 疎通を確認するため常に動的・Node ランタイムで実行。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ヘルスチェック（監視・デプロイ確認用）。DB 疎通を検査し、
 * 各連携の有効/無効（秘密情報は返さない）を報告する。
 * DB 不通時は 503 を返す。
 */
export async function GET() {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (err) {
    logger.error("health: db check failed", err);
  }

  const body = {
    status: dbOk ? "ok" : "degraded",
    db: dbOk,
    integrations: {
      stripe: isStripeEnabled,
      email: isEmailEnabled,
      rateLimit: isRateLimitEnabled,
      sentry: isSentryActive(),
    },
    time: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: dbOk ? 200 : 503 });
}
