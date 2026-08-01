"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminAction } from "@/lib/safe-action";
import { writeAudit } from "@/lib/audit";
import { effectiveAdminRole, hasAdminRole } from "@/lib/admin-role";
import {
  LOG_KINDS,
  LOG_KIND_LABEL,
  PURGE_MAX_IDS,
  checkPurge,
  purgeCutoff,
  type LogKind,
} from "./log-purge";

const purgeInput = z.object({
  kind: z.enum(LOG_KINDS),
  ids: z.array(z.string()).max(PURGE_MAX_IDS).optional(),
  olderThanDays: z.number().int().min(0).max(3650).optional(),
  reason: z.string().trim().max(200).optional(),
});

/** 種類ごとに、どのテーブルのどの日時列を見るか。 */
const TARGET: Record<LogKind, { dateField: string; delete: (where: object) => Promise<number> }> = {
  CRON: {
    dateField: "startedAt",
    delete: async (where) => (await db.cronRun.deleteMany({ where })).count,
  },
  EMAIL: {
    dateField: "createdAt",
    delete: async (where) => (await db.emailLog.deleteMany({ where })).count,
  },
  ERROR: {
    // エラーは同じものがまとまって1行になる。最後に見た時刻で古さを測る。
    dateField: "lastSeen",
    delete: async (where) => (await db.errorEvent.deleteMany({ where })).count,
  },
  AUDIT: {
    dateField: "createdAt",
    delete: async (where) => (await db.auditLog.deleteMany({ where })).count,
  },
};

/**
 * ログを消す。全権のみ。
 *
 * 消したこと自体を監査ログに残す。削除は監査ログを書いたあとではなく
 * 先に行う（監査ログの掃除で、いま書いた行まで巻き込まないため）。
 */
export const purgeLogs = adminAction("SUPER", purgeInput, async (input, user) => {
  // 監査ログだけは、この action の最低権限が将来ゆるめられても
  // 最高責任者に限る。証跡を消せる人を増やさない。
  if (input.kind === "AUDIT") {
    const role = effectiveAdminRole(user.adminRole, user.isAdmin);
    if (!hasAdminRole(role, "SUPER")) throw new Error("AUDIT_SUPER_ONLY");
  }

  const verdict = checkPurge(input, { hasReason: Boolean(input.reason?.trim()) });
  if (!verdict.ok) throw new Error(verdict.code);

  const target = TARGET[input.kind];
  const where =
    input.olderThanDays !== undefined
      ? { [target.dateField]: { lt: purgeCutoff(input.olderThanDays) } }
      : { id: { in: input.ids! } };

  const deleted = await target.delete(where);

  await writeAudit({
    actor: user,
    action: "LOG_PURGE",
    targetType: "SYSTEM",
    targetLabel: LOG_KIND_LABEL[input.kind],
    after: {
      種類: LOG_KIND_LABEL[input.kind],
      条件:
        input.olderThanDays !== undefined
          ? input.olderThanDays === 0
            ? "すべて"
            : `${input.olderThanDays}日より古いもの`
          : `選択した${input.ids?.length ?? 0}件`,
      削除件数: deleted,
    },
    reason: input.reason || undefined,
  });

  revalidatePath("/admin/ops");
  revalidatePath("/admin/audit");
  return { deleted };
});
