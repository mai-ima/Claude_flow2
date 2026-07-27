import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";

/**
 * 運用の記録（バッチ実行・メール送信・エラー）。
 *
 * 共通の方針: ここでの失敗はアプリの動作を止めない。
 * 記録が取れないことより、記録のせいで本来の処理が落ちる方が損害が大きい。
 * 失敗は console に落として気づけるようにする。
 */

function swallow(label: string) {
  return (err: unknown) => {
    console.error(`[ops-log] ${label} failed`, err);
  };
}

// ── バッチ実行 ──────────────────────────────

export async function startCronRun(job: string, trigger: "SCHEDULE" | "MANUAL", actorId?: string) {
  try {
    const run = await db.cronRun.create({
      data: { job, trigger, status: "RUNNING", actorId },
    });
    return run.id;
  } catch (err) {
    swallow("startCronRun")(err);
    return null;
  }
}

export async function finishCronRun(
  id: string | null,
  status: "SUCCESS" | "FAILED",
  payload: { result?: unknown; error?: string },
) {
  if (!id) return;
  try {
    await db.cronRun.update({
      where: { id },
      data: {
        status,
        endedAt: new Date(),
        result:
          payload.result === undefined ? undefined : JSON.parse(JSON.stringify(payload.result)),
        error: payload.error?.slice(0, 2000),
      },
    });
  } catch (err) {
    swallow("finishCronRun")(err);
  }
}

// ── メール送信 ──────────────────────────────

export type EmailKind = "REMINDER" | "CONTACT" | "VERIFY" | "RESET" | "BROADCAST";

export async function recordEmail(input: {
  to: string;
  subject: string;
  kind: EmailKind;
  status: "SENT" | "SKIPPED" | "FAILED";
  error?: string;
}) {
  try {
    await db.emailLog.create({
      data: { ...input, error: input.error?.slice(0, 1000) },
    });
  } catch (err) {
    swallow("recordEmail")(err);
  }
}

// ── アプリケーションエラー ───────────────────

/**
 * 同じ不具合をひとつにまとめるためのキー。
 * メッセージとスタックの先頭行から作る（行番号まで含めると
 * デプロイのたびに別物として数えられてしまう）。
 */
export function fingerprintOf(message: string, stack?: string): string {
  const head = (stack ?? "").split("\n").slice(0, 2).join("|").replace(/:\d+:\d+/g, "");
  return createHash("sha256").update(`${message}|${head}`).digest("hex").slice(0, 32);
}

export async function recordError(input: {
  level: "ERROR" | "WARN";
  message: string;
  stack?: string;
  context?: unknown;
  userId?: string;
  path?: string;
}) {
  try {
    const fingerprint = fingerprintOf(input.message, input.stack);
    await db.errorEvent.upsert({
      where: { fingerprint },
      create: {
        fingerprint,
        level: input.level,
        message: input.message.slice(0, 1000),
        stack: input.stack?.slice(0, 4000),
        context:
          input.context === undefined ? undefined : JSON.parse(JSON.stringify(input.context)),
        userId: input.userId,
        path: input.path,
      },
      // 同じ不具合が再発したら件数と最終発生だけ更新する。
      update: { count: { increment: 1 }, lastSeen: new Date() },
    });
  } catch (err) {
    swallow("recordError")(err);
  }
}
