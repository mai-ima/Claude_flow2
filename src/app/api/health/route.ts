import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  isStripeEnabled,
  isEmailEnabled,
  isRateLimitEnabled,
} from "@/lib/env";
import { logger } from "@/lib/logger";
import { isSentryActive } from "@/lib/logger";
import { EXPECTED_MIGRATIONS } from "@/lib/expected-migrations";
import { APP_VERSION } from "@/lib/seo";

// DB 疎通を確認するため常に動的・Node ランタイムで実行。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SchemaState = {
  ok: boolean;
  /** 適用済みマイグレーション数と、このコードが必要とする数。 */
  applied: number;
  expected: number;
  /** 足りないマイグレーション名。デプロイの取りこぼしを特定するために出す。 */
  missing: string[];
  hint?: string;
};

/**
 * データベースが今のコードに追いついているかを見る。
 *
 * SELECT 1 が通っても、列が足りなければログインは 500 になる。
 * 疎通だけでは「動いている」と言えないので、適用済みマイグレーションの
 * 記録と、このコードが必要とする一覧を突き合わせる。
 */
async function checkSchema(): Promise<SchemaState> {
  const expected = EXPECTED_MIGRATIONS.length;
  try {
    const rows = await db.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
    `;
    const applied = new Set(rows.map((r) => r.migration_name));
    const missing = EXPECTED_MIGRATIONS.filter((m) => !applied.has(m));
    return {
      ok: missing.length === 0,
      applied: applied.size,
      expected,
      missing,
      hint: missing.length
        ? "データベースがコードより古い状態です。デプロイ時のマイグレーションが実行されているか確認してください。"
        : undefined,
    };
  } catch (err) {
    // 履歴テーブルが無い＝ migrate deploy を一度も通していないデータベース。
    logger.error("health: schema check failed", err);
    return {
      ok: false,
      applied: 0,
      expected,
      missing: [...EXPECTED_MIGRATIONS],
      hint: "マイグレーション履歴が見つかりません。デプロイでマイグレーションが実行されていない可能性があります。",
    };
  }
}

/**
 * ヘルスチェック（監視・デプロイ確認用）。DB 疎通とスキーマの新旧を検査し、
 * 各連携の有効/無効（秘密情報は返さない）を報告する。
 * DB 不通、またはスキーマが古い場合は 503 を返す。
 */
export async function GET() {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (err) {
    logger.error("health: db check failed", err);
  }

  const schema: SchemaState = dbOk
    ? await checkSchema()
    : {
        ok: false,
        applied: 0,
        expected: EXPECTED_MIGRATIONS.length,
        missing: [...EXPECTED_MIGRATIONS],
        hint: "データベースに接続できません。",
      };

  const healthy = dbOk && schema.ok;
  const body = {
    status: healthy ? "ok" : "degraded",
    version: APP_VERSION,
    db: dbOk,
    schema,
    integrations: {
      stripe: isStripeEnabled,
      email: isEmailEnabled,
      rateLimit: isRateLimitEnabled,
      sentry: isSentryActive(),
    },
    time: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: healthy ? 200 : 503 });
}
