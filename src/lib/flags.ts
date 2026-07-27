import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { db } from "./db";
import type { PlanTier } from "./enums";

/**
 * 機能フラグ。段階公開のために「割合」と「対象プラン」を持つ。
 *
 * 割合の判定は userId のハッシュで行う。乱数にすると、同じ人が
 * 読み込みのたびに機能が出たり消えたりして使い物にならない。
 */

export interface FlagAudience {
  userId: string;
  tier: PlanTier;
}

/** 0〜99 の安定した値。同じ userId × key なら常に同じ。 */
export function bucketOf(userId: string, key: string): number {
  const h = createHash("sha256").update(`${key}:${userId}`).digest();
  return h.readUInt32BE(0) % 100;
}

export interface FlagRecord {
  key: string;
  enabled: boolean;
  rolloutPct: number;
  tiers: string[] | null;
}

/** 判定の本体（純関数・テスト可能）。 */
export function evaluateFlag(flag: FlagRecord | undefined, who: FlagAudience): boolean {
  if (!flag) return false;
  if (!flag.enabled) return false;
  if (flag.tiers && flag.tiers.length > 0 && !flag.tiers.includes(who.tier)) return false;
  if (flag.rolloutPct >= 100) return true;
  if (flag.rolloutPct <= 0) return false;
  return bucketOf(who.userId, flag.key) < flag.rolloutPct;
}

function toRecord(row: {
  key: string;
  enabled: boolean;
  rolloutPct: number;
  tiers: unknown;
}): FlagRecord {
  return {
    key: row.key,
    enabled: row.enabled,
    rolloutPct: row.rolloutPct,
    tiers: Array.isArray(row.tiers) ? row.tiers.filter((t): t is string => typeof t === "string") : null,
  };
}

/**
 * 全フラグ。リクエスト内で1回だけ引く。
 * DB が落ちているときにアプリ全体を落とさないよう、失敗時は空で返す
 * （＝すべて無効。フラグは「追加機能を出す」ためのものなので、
 * 出ないことが安全側）。
 */
export const loadFlags = cache(async (): Promise<Map<string, FlagRecord>> => {
  try {
    const rows = await db.featureFlag.findMany();
    return new Map(rows.map((r) => [r.key, toRecord(r)]));
  } catch {
    return new Map();
  }
});

export async function isEnabled(key: string, who: FlagAudience): Promise<boolean> {
  const flags = await loadFlags();
  return evaluateFlag(flags.get(key), who);
}
