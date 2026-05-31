import { NextResponse } from "next/server";
import { env, isEmailEnabled } from "@/lib/env";
import { processRenewals, dueReminders } from "@/lib/orchestrator";

/**
 * 更新日の自動記帳 + リマインダー判定。Vercel Cron 等から呼ばれる想定。
 * CRON_SECRET が設定されている場合は Bearer 認証を要求。
 */
async function handle(req: Request) {
  if (env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const posted = await processRenewals(now);
  const reminders = await dueReminders(now);

  // メールが有効なら送信（ここでは送信ロジックの差込み口のみ。無効時はログのみ）。
  if (isEmailEnabled) {
    // TODO: Resend で reminders を送信
  }

  return NextResponse.json({
    ok: true,
    autoPosted: posted,
    reminders: reminders.map((r) => ({
      name: r.name,
      daysUntil: r.daysUntil,
      to: r.ownerEmail,
    })),
    emailEnabled: isEmailEnabled,
  });
}

export const GET = handle;
export const POST = handle;
