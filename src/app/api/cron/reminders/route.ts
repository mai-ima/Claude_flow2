import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { runReminders } from "@/lib/run-reminders";

/**
 * 更新日の自動記帳 + リマインダー判定。Vercel Cron 等から呼ばれる想定。
 * Bearer 認証を要求する。自動記帳・通知送信・データ削除を行うため、
 * 本番で CRON_SECRET が未設定の場合は開放せず 503 で停止する（fail-closed）。
 *
 * 処理そのものは runReminders に置いてある（管理画面の手動実行と共用）。
 * ここは認証と応答だけを持つ。
 */
async function handle(req: Request) {
  if (!env.CRON_SECRET) {
    if (env.NODE_ENV === "production") {
      logger.error("CRON_SECRET is not configured; refusing to run cron");
      return NextResponse.json({ error: "not configured" }, { status: 503 });
    }
  } else {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runReminders("SCHEDULE");
    return NextResponse.json(result);
  } catch {
    // 詳細は CronRun とエラーログに残る。応答には内部情報を出さない。
    return NextResponse.json({ ok: false, error: "処理に失敗しました。" }, { status: 500 });
  }
}

/**
 * 自動記帳・通知送信・古いデータの削除を行う破壊的処理のため POST のみ。
 * GET は副作用なしでなければならない（プリフェッチやクローラで発火するため）。
 * Vercel Cron は GET で叩くので、cron からは Bearer 認証つきの GET を許可する。
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "method not allowed" }, { status: 405 });
  }
  return handle(req);
}

export const POST = handle;

/** Vercel の関数タイムアウト。段ごとに並行実行するが、件数が伸びるため長めに取る。 */
export const maxDuration = 300;
