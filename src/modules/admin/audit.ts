import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { SessionUser } from "@/lib/auth";

/**
 * 管理操作の証跡。
 *
 * 対象が削除されたあとも「誰を消したのか」が分かる必要があるため、
 * 参照ではなくスナップショット（actorEmail / targetLabel）で持つ。
 * 外部キーを張らないのも同じ理由。
 */
export type AuditAction =
  | "USER_TIER_CHANGE"
  | "USER_ADMIN_ROLE_CHANGE"
  | "USER_DELETE"
  | "USER_SUSPEND"
  | "USER_UNSUSPEND"
  | "USER_EXPORT"
  | "IMPERSONATE_START"
  | "IMPERSONATE_END"
  | "CRON_RUN_MANUAL"
  | "EMAIL_RESEND"
  | "BROADCAST_SEND"
  | "RELEASE_NOTE_PUBLISH"
  | "FEATURE_FLAG_CHANGE"
  | "SYSTEM_SETTING_CHANGE"
  | "STRIPE_SYNC";

export interface AuditInput {
  actor: SessionUser;
  action: AuditAction;
  targetType: "USER" | "LEDGER" | "SYSTEM";
  targetId?: string;
  targetLabel?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

async function clientIp(): Promise<string | undefined> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
  } catch {
    return undefined;
  }
}

/**
 * 証跡を書く。
 *
 * ここでの失敗が管理操作そのものを巻き戻すべきかは判断が割れるが、
 * 「記録できないなら実行しない」を選ぶと監査テーブルの不調でサポート業務が
 * 止まる。記録は best-effort とし、失敗はエラーログに残して検知する。
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actor.id,
        actorEmail: input.actor.email ?? "(メール未設定)",
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        targetLabel: input.targetLabel,
        before: input.before === undefined ? undefined : JSON.parse(JSON.stringify(input.before)),
        after: input.after === undefined ? undefined : JSON.parse(JSON.stringify(input.after)),
        reason: input.reason,
        ip: await clientIp(),
      },
    });
  } catch (err) {
    logger.error("audit write failed", { action: input.action, error: err });
  }
}
