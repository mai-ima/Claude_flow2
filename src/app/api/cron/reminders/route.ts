import { NextResponse } from "next/server";
import { env, isEmailEnabled } from "@/lib/env";
import { processRenewals, dueReminders, notifyDueRenewals } from "@/lib/orchestrator";
import { sendEmail, emailLayout } from "@/lib/email";
import { formatMoney } from "@/lib/money";
import { logger } from "@/lib/logger";

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

  // メール送信（env 差込み式・キーが無ければ no-op）。オーナーごとに1通。
  let emailsSent = 0;
  if (isEmailEnabled) {
    const byEmail = new Map<string, typeof reminders>();
    for (const r of reminders) {
      if (!r.ownerEmail) continue;
      const arr = byEmail.get(r.ownerEmail) ?? [];
      arr.push(r);
      byEmail.set(r.ownerEmail, arr);
    }
    for (const [to, list] of byEmail) {
      const rows = list
        .map(
          (r) =>
            `<li>${r.name}（${formatMoney(r.amount)}）— ${r.daysUntil === 0 ? "本日更新" : `あと${r.daysUntil}日`}</li>`,
        )
        .join("");
      const { sent } = await sendEmail({
        to,
        subject: "まもなく更新されるサブスクがあります",
        html: emailLayout("更新のお知らせ", `<ul>${rows}</ul>`),
      });
      if (sent) emailsSent++;
    }
    logger.info("reminder emails", { count: emailsSent });
  }

  return NextResponse.json({
    ok: true,
    autoPosted: posted,
    notified,
    emailsSent,
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
