import { NextResponse } from "next/server";
import { env, isEmailEnabled } from "@/lib/env";
import { processRenewals, dueReminders, notifyDueRenewals } from "@/lib/orchestrator";

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
  const notified = await notifyDueRenewals(now);
  const reminders = await dueReminders(now);

  // メール送信は B4（lib/email.ts）で実装。無効時はログのみ。
  if (isEmailEnabled) {
    // 実装は lib/email.ts 導入後に接続
  }

  return NextResponse.json({
    ok: true,
    autoPosted: posted,
    notified,
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
