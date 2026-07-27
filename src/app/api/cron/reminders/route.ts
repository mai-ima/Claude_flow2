import { NextResponse } from "next/server";
import { env, isEmailEnabled } from "@/lib/env";
import {
  processRenewals,
  dueReminders,
  notifyDueRenewals,
  processRecurring,
  processAutoContributions,
  notifyBudgetOverages,
  notifyTrialEnds,
  pruneExpiredData,
} from "@/lib/orchestrator";
import {
  notifyWasteSubscriptions,
  notifyPriceChanges,
  notifyWeeklySummary,
  notifyGoals,
  notifyRecurringPosted,
} from "@/lib/notify-rules";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email";
import { formatMoney } from "@/lib/money";
import { logger } from "@/lib/logger";

/**
 * 更新日の自動記帳 + リマインダー判定。Vercel Cron 等から呼ばれる想定。
 * Bearer 認証を要求する。自動記帳・通知送信・データ削除を行うため、
 * 本番で CRON_SECRET が未設定の場合は開放せず 503 で停止する（fail-closed）。
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

  const now = new Date();

  // 第1段: 記帳を伴うバッチ。互いに独立なので並行実行する。
  // 第2段の通知・集計はこれらが作った取引を読むため、段は直列に保つ。
  const [posted, recurring, contributed] = await Promise.all([
    processRenewals(now),
    processRecurring(now),
    processAutoContributions(now),
  ]);

  // 更新日を進めた後の一覧。アプリ内通知とメールで共用する。
  const reminders = await dueReminders(now);

  const [
    notified,
    budgetAlerts,
    trialAlerts,
    pruned,
    wasteAlerts,
    priceAlerts,
    weeklySummaries,
    goalAlerts,
    recurringAlerts,
  ] = await Promise.all([
    notifyDueRenewals(now, reminders),
    notifyBudgetOverages(now),
    notifyTrialEnds(now),
    pruneExpiredData(now),
    notifyWasteSubscriptions(now),
    notifyPriceChanges(now),
    notifyWeeklySummary(now),
    notifyGoals(now),
    notifyRecurringPosted(now),
  ]);

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
    // 宛先ごとに1通。送信は独立なので並行に投げ、1件の失敗で全体を止めない。
    const results = await Promise.allSettled(
      [...byEmail].map(([to, list]) => {
        const rows = list
          .map(
            (r) =>
              `<li>${escapeHtml(r.name)}（${formatMoney(r.amount)}）— ${r.daysUntil === 0 ? "本日更新" : `あと${r.daysUntil}日`}</li>`,
          )
          .join("");
        return sendEmail({
          to,
          subject: "まもなく更新されるサブスクがあります",
          html: emailLayout("更新のお知らせ", `<ul>${rows}</ul>`),
        });
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.sent) emailsSent++;
      else if (r.status === "rejected") logger.error("reminder email failed", { error: r.reason });
    }
    logger.info("reminder emails", { count: emailsSent });
  }

  // 応答には件数のみを載せる。
  // 以前は対象者のメールアドレスとサブスク名を全件返しており、
  // 実行できる者に全テナントの個人情報が渡っていた。
  return NextResponse.json({
    ok: true,
    autoPosted: posted,
    recurringPosted: recurring,
    autoContributions: contributed,
    notified,
    pruned,
    budgetAlerts,
    trialAlerts,
    wasteAlerts,
    priceAlerts,
    weeklySummaries,
    goalAlerts,
    recurringAlerts,
    emailsSent,
    reminders: reminders.length,
    emailEnabled: isEmailEnabled,
  });
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
