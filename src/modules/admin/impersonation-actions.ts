"use server";

import { redirect } from "next/navigation";
import { endImpersonation, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * 成りすまし閲覧の終了。
 *
 * adminAction は通さない。あのラッパーは impersonatedBy が立っている
 * セッションからの操作を一律で拒否するため、終了操作まで拒否されて
 * 抜け出せなくなる。ここは「自分の閲覧を終える」だけなので、
 * セッション自身が成りすましであることを確認すれば足りる。
 */
export async function endImpersonationAction() {
  const user = await getCurrentUser();
  if (user?.impersonatedBy) {
    try {
      const admin = await db.user.findUnique({
        where: { id: user.impersonatedBy },
        select: { id: true, email: true },
      });
      await db.auditLog.create({
        data: {
          actorId: admin?.id ?? user.impersonatedBy,
          actorEmail: admin?.email ?? "(不明)",
          action: "IMPERSONATE_END",
          targetType: "USER",
          targetId: user.id,
          targetLabel: user.email ?? undefined,
        },
      });
    } catch (err) {
      logger.error("audit write failed", { action: "IMPERSONATE_END", error: err });
    }
  }
  await endImpersonation();
  redirect("/admin/users");
}
