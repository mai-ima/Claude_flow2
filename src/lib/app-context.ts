import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { getActiveLedger } from "./ledger-access";
import type { MemberRole, PlanTier } from "./enums";
import { isBetaEnabled, type BetaFeatureKey } from "./beta-features";
import { jstYearMonth, monthAnchorJST } from "./date";

/**
 * 認証済みページ用: ユーザー + アクティブ帳簿 + 権限 + プランをまとめて取得。
 * リクエスト内メモ化により、layout と各 page から呼ばれても実クエリは 1 回に集約。
 */
export const getAppContext = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { ledger, role } = await getActiveLedger(user.id);
  return {
    user,
    ledger,
    ledgerId: ledger.id,
    role: role as MemberRole,
    canEdit: role === "OWNER" || role === "EDITOR",
    /**
     * 記録を追加できるか。
     * SELF_EDITOR は追加はできる（直せるのが自分の記録だけ）。
     * 追加ボタンの出し分けはこちらを見る。canEdit を使うと、
     * 追加できるはずの人にボタンが出ない。
     */
    canAdd: role === "OWNER" || role === "EDITOR" || role === "SELF_EDITOR",
    /** 他人の記録も直せるか。SELF_EDITOR は false。 */
    canEditOthers: role === "OWNER" || role === "EDITOR",
    isPod: ledger.type === "POD",
    tier: user.tier as PlanTier,
    currency: ledger.currency,
    betaOptIn: user.betaOptIn,
    /** 機能ごとの判定。beta={betaOptIn} の代わりにこれを使う。 */
    beta: (key: BetaFeatureKey) =>
      isBetaEnabled({ optIn: user.betaOptIn, features: user.betaFeatures }, key),
  };
});

/**
 * searchParams から対象月を解決（?m=YYYY-MM）。
 *
 * 返すのは「日本時間のその月の1日 0:00」。実行環境の時間帯で作ると、
 * サーバーが UTC のとき日本時間の朝8時台に前の月が選ばれる
 * （日本時間 8/1 05:00 は UTC ではまだ 7/31）。
 */
export function resolveMonth(m?: string): Date {
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mo] = m.split("-").map(Number);
    return monthAnchorJST(y, mo - 1);
  }
  const { year, month } = jstYearMonth(new Date());
  return monthAnchorJST(year, month);
}

export function monthParam(d: Date): string {
  const { year, month } = jstYearMonth(d);
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}
