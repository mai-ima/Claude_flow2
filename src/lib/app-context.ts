import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { getActiveLedger } from "./ledger-access";
import type { MemberRole, PlanTier } from "./enums";

/** 認証済みページ用: ユーザー + アクティブ帳簿 + 権限 + プランをまとめて取得。 */
export async function getAppContext() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { ledger, role } = await getActiveLedger(user.id);
  return {
    user,
    ledger,
    ledgerId: ledger.id,
    role: role as MemberRole,
    canEdit: role === "OWNER" || role === "EDITOR",
    isPod: ledger.type === "POD",
    tier: user.tier as PlanTier,
    currency: ledger.currency,
  };
}

/** searchParams から対象月を解決（?m=YYYY-MM）。 */
export function resolveMonth(m?: string): Date {
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mo] = m.split("-").map(Number);
    return new Date(y, mo - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function monthParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
