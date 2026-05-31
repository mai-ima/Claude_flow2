import { daysSince } from "@/lib/date";

export const WASTE_THRESHOLD_DAYS = 90;

export type WasteLevel = "none" | "watch" | "waste";

/**
 * 無駄サブスク検出（ルールベース・LLM 不使用）。
 * 最終利用日からの経過日数で判定する。
 */
export function detectWaste(lastUsedAt: Date | null, status: string): WasteLevel {
  if (status !== "ACTIVE" && status !== "TRIAL") return "none";
  const days = daysSince(lastUsedAt);
  if (days === null) return "none"; // 未記録は判定しない
  if (days >= WASTE_THRESHOLD_DAYS) return "waste";
  if (days >= WASTE_THRESHOLD_DAYS / 2) return "watch";
  return "none";
}

export function wasteMessage(lastUsedAt: Date | null): string | null {
  const days = daysSince(lastUsedAt);
  if (days === null) return null;
  if (days >= WASTE_THRESHOLD_DAYS) {
    return `${days}日間 利用記録がありません。見直しの好機かもしれません。`;
  }
  if (days >= WASTE_THRESHOLD_DAYS / 2) {
    return `最終利用から${days}日。最近の利用は控えめです。`;
  }
  return null;
}
