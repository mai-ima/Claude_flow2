import "server-only";
import { isEmailEnabled } from "./env";
import {
  processRenewals,
  dueReminders,
  notifyDueRenewals,
  processRecurring,
  processAutoContributions,
  notifyBudgetOverages,
  notifyTrialEnds,
  pruneExpiredData,
} from "./orchestrator";
import {
  notifyWasteSubscriptions,
  notifyPriceChanges,
  notifyWeeklySummary,
  notifyGoals,
  notifyRecurringPosted,
} from "./notify-rules";
import { sendEmail, emailLayout, escapeHtml } from "./email";
import { formatMoney } from "./money";
import { logger } from "./logger";
import { startCronRun, finishCronRun } from "./ops-log";
import { purgeExpiredTokens } from "./verification-token";

/**
 * 毎日のバッチ本体。
 *
 * HTTP のルートと管理画面の「いま実行する」の両方から呼ぶため、
 * リクエストに依存しない形でここに置く（ルートは認証と応答だけを持つ）。
 */
export async function runReminders(
  trigger: "SCHEDULE" | "MANUAL",
  actorId?: string,
  now: Date = new Date(),
) {
  const runId = await startCronRun("reminders", trigger, actorId);

  try {
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

    // 期限切れの使い捨てトークンを片付ける。放っておくと使えない行が
    // 溜まり続ける（消し忘れても危険ではないが、置いておく理由も無い）。
    const purgedTokens = await purgeExpiredTokens().catch(() => 0);
    if (purgedTokens > 0) logger.info("expired tokens purged", { purgedTokens });

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
            kind: "REMINDER",
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
    const result = {
      ok: true as const,
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
    };
    await finishCronRun(runId, "SUCCESS", { result });
    return result;
  } catch (err) {
    // 失敗を握り潰さない。履歴に残して管理画面から気づけるようにする。
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[cron/reminders]", err);
    await finishCronRun(runId, "FAILED", { error: message });
    throw err;
  }
}
